package com.service.impl;

import com.dto.TransactionRequestDTO;
import com.dto.TransactionResponseDTO;
import com.entity.Item;
import com.entity.Transaction;
import com.entity.User;
import com.entity.enums.ItemStatus;
import com.entity.enums.TransactionStatus;
import com.entity.enums.TransactionType;
import com.exception.ResourceNotFoundException;
import com.exception.UnauthorizedException;
import com.exception.ValidationException;
import com.repository.ItemRepository;
import com.repository.TransactionRepository;
import com.repository.UserRepository;
import com.service.NotificationInterfaceService;
import com.service.TransactionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionServiceImpl implements TransactionService {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final ItemRepository itemRepository;
    private final NotificationInterfaceService notificationService;
    private final ModelMapper modalMapper;

    @Transactional(readOnly = true)
    public Page<TransactionResponseDTO> getAllTransactions(Pageable pageable) {
        return transactionRepository.findAll(pageable)
                .map(this::convertToDto);
    }

    @Transactional(readOnly = true)
    public Page<TransactionResponseDTO> getTransactionsByStatus(TransactionStatus status, Pageable pageable) {
        return transactionRepository.findByStatus(status, pageable)
                .map(this::convertToDto);
    }

    private TransactionResponseDTO convertToDto(Transaction transaction) {
        TransactionResponseDTO dto = new TransactionResponseDTO();
        if (transaction == null) return dto;
        dto.setId(transaction.getId());

        // Map item details (null-safe)
        Item item = transaction.getItem();
        if (item != null) {
            dto.setItemId(item.getId());
            dto.setItemName(item.getTitle());
            dto.setItemDescription(item.getDescription());
            // pick first image if available
            dto.setItemImage(item.getImageUrls() != null && !item.getImageUrls().isEmpty()
                    ? item.getImageUrls().get(0)
                    : null);
            // safe price handling
            dto.setAmount(item.getPrice() != null ? item.getPrice().longValue() : 0L);

            // Map seller details
            if (item.getUser() != null) {
                dto.setSellerId(item.getUser().getId());
                dto.setSellerName(item.getUser().getName());
                dto.setSellerEmail(item.getUser().getEmail());
                dto.setSellerPhone(item.getUser().getMobile());
            }
        } else {
            dto.setAmount(0L);
        }

        // Map buyer details
        if (transaction.getBuyer() != null) {
            dto.setBuyerId(transaction.getBuyer().getId());
            dto.setBuyerName(transaction.getBuyer().getName());
            dto.setBuyerEmail(transaction.getBuyer().getEmail());
            dto.setBuyerPhone(transaction.getBuyer().getMobile());
        }

        // Map swap item details if it's a swap transaction
        if (transaction.getType() == TransactionType.SWAP && transaction.getSwapItem() != null) {
            dto.setSwapItemId(transaction.getSwapItem().getId());
            dto.setSwapItemName(transaction.getSwapItem().getTitle());
        }

        dto.setType(transaction.getType());
        dto.setStatus(transaction.getStatus() != null ? transaction.getStatus().name() : null);
        dto.setMessage(transaction.getMessage());
        dto.setCreatedAt(transaction.getCreatedAt());
        dto.setUpdatedAt(transaction.getUpdatedAt());

        return dto;
    }


    @Override
    @Transactional
    public TransactionResponseDTO createTransaction(String userEmail, TransactionRequestDTO request) {
        User buyer = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Item item = itemRepository.findById(request.getItemId())
                .orElseThrow(() -> new ResourceNotFoundException("Item not found"));

        // Prevent self-transaction
        if (item.getUser().getEmail().equals(userEmail)) {
            throw new ValidationException("Cannot create transaction for your own item");
        }

        // Additional validation for swap
        if (request.getType() != null && request.getType().equalsIgnoreCase(TransactionType.SWAP.name())) {
            validateSwapRequest(request, userEmail);
        }

        Transaction transaction = createNewTransaction(request, buyer, item);
        Transaction savedTransaction = transactionRepository.save(transaction);

        sendNotificationToItemOwner(item, savedTransaction);

        return modalMapper.map(savedTransaction, TransactionResponseDTO.class);
    }

    private void validateSwapRequest(TransactionRequestDTO request, String userEmail) {
        if (request.getSwapItemId() == null) {
            throw new ValidationException("Swap item ID is required for SWAP transactions");
        }

        Item swapItem = itemRepository.findById(request.getSwapItemId())
                .orElseThrow(() -> new ResourceNotFoundException("Swap item not found"));

        // Verify the swap item belongs to the current user
        if (!swapItem.getUser().getEmail().equals(userEmail)) {
            throw new UnauthorizedException("You don't own the swap item");
        }

        // Verify the swap item is available
        if (swapItem.getStatus() != ItemStatus.AVAILABLE) {
            throw new ValidationException("The item you want to swap is not available");
        }
    }

    private Transaction createNewTransaction(TransactionRequestDTO request, User buyer, Item item) {
        // Validate request type
        if (request.getType() == null || request.getType().trim().isEmpty()) {
            throw new ValidationException("Transaction type is required");
        }

        // Convert to enum
        TransactionType transactionType;
        try {
            transactionType = TransactionType.valueOf(request.getType().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ValidationException("Invalid transaction type: " + request.getType() +
                    ". Must be one of: " + Arrays.toString(TransactionType.values()));
        }

        Transaction transaction = new Transaction();
        transaction.setItem(item);
        transaction.setBuyer(buyer);
        transaction.setType(transactionType);  // Use the converted enum
        transaction.setStatus(TransactionStatus.PENDING);
        transaction.setMessage(request.getMessage());
        transaction.setCreatedAt(LocalDateTime.now());
        transaction.setUpdatedAt(LocalDateTime.now());

        // Handle swap-specific logic
        if (transactionType == TransactionType.SWAP) {
            if (request.getSwapItemId() == null) {
                throw new ValidationException("Swap item ID is required for SWAP transactions");
            }

            Item swapItem = itemRepository.findById(request.getSwapItemId())
                    .orElseThrow(() -> new ResourceNotFoundException("Swap item not found"));
            transaction.setSwapItem(swapItem);

            // Mark swap item as pending
            swapItem.setStatus(ItemStatus.PENDING);
            itemRepository.save(swapItem);
        }

        return transaction;
    }

    private void sendNotificationToItemOwner(Item item, Transaction transaction) {
        String message = String.format(
                "New %s request for your item: %s",
                transaction.getType().toString().toLowerCase(),
                item.getTitle()
        );

        notificationService.sendNotification(
                item.getUser().getId(),
                "New Transaction Request",
                message,
                "/transactions/" + transaction.getId()
        );
    }

    @Override
    public List<TransactionResponseDTO> getSentTransactions(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return transactionRepository.findByBuyerId(user.getId()).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<TransactionResponseDTO> getReceivedTransactions(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return transactionRepository.findByItemUserId(user.getId()).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public TransactionResponseDTO getTransactionById(String userEmail, Long transactionId) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found"));

        // Verify the user is either the buyer or the item owner
        boolean isBuyer = transaction.getBuyer().getId().equals(user.getId());
        boolean isSeller = transaction.getItem().getUser().getId().equals(user.getId());

        if (!isBuyer && !isSeller) {
            throw new UnauthorizedException("You are not authorized to view this transaction");
        }

        return mapToDTO(transaction);
    }

    @Override
    @Transactional
    public TransactionResponseDTO updateTransactionStatus(String userEmail, Long transactionId, String status) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found"));

        // Verify the user is the item owner
        if (transaction.getItem() == null || transaction.getItem().getUser() == null ||
                !transaction.getItem().getUser().getId().equals(user.getId())) {
            throw new UnauthorizedException("You are not authorized to update this transaction");
        }

        TransactionStatus newStatus = TransactionStatus.valueOf(status.toUpperCase());
        transaction.setStatus(newStatus);
        transaction.setUpdatedAt(LocalDateTime.now());

        Transaction updatedTransaction = transactionRepository.save(transaction);

        // Notify buyer about status update
        notificationService.sendNotification(
                transaction.getBuyer().getId(),
                "Transaction Status Updated",
                String.format("Your %s request for '%s' has been %s",
                        transaction.getType().name().toLowerCase(),
                        transaction.getItem().getTitle(),
                        newStatus.name().toLowerCase()),
                "/transactions/" + transactionId
        );

        return mapToDTO(updatedTransaction);
    }

    private TransactionResponseDTO mapToDTO(Transaction transaction) {
        TransactionResponseDTO dto = new TransactionResponseDTO();
        if (transaction == null) return dto;

        dto.setId(transaction.getId());

        Item item = transaction.getItem();
        if (item != null) {
            dto.setItemId(item.getId());
            dto.setItemName(item.getTitle());
            dto.setItemDescription(item.getDescription());
            dto.setItemImage(item.getImageUrls() != null && !item.getImageUrls().isEmpty()
                    ? item.getImageUrls().get(0)
                    : null);
            dto.setAmount(item.getPrice() != null ? item.getPrice().longValue() : 0L);

            User seller = item.getUser();
            if (seller != null) {
                dto.setSellerId(seller.getId());
                dto.setSellerName(seller.getName());
                dto.setSellerEmail(seller.getEmail());
                dto.setSellerPhone(seller.getMobile());
            }
        } else {
            dto.setAmount(0L);
        }

        User buyer = transaction.getBuyer();
        if (buyer != null) {
            dto.setBuyerId(buyer.getId());
            dto.setBuyerName(buyer.getName());
            dto.setBuyerEmail(buyer.getEmail());
            dto.setBuyerPhone(buyer.getMobile());
        }

        dto.setType(transaction.getType());
        dto.setStatus(transaction.getStatus() != null ? transaction.getStatus().name() : null);
        dto.setMessage(transaction.getMessage());
        dto.setCreatedAt(transaction.getCreatedAt());
        dto.setUpdatedAt(transaction.getUpdatedAt());

        if (transaction.getSwapItem() != null) {
            dto.setSwapItemId(transaction.getSwapItem().getId());
            dto.setSwapItemName(transaction.getSwapItem().getTitle());
        }

        return dto;
    }


    @Override
    public List<Transaction> getReceivedTransactionsByStatus(String userEmail, TransactionStatus status) {
        return transactionRepository.findByItemUserEmailAndStatus(userEmail, status);
    }

    @Override
    public List<Transaction> getSentTransactionsByStatus(String userEmail, TransactionStatus status) {
        return transactionRepository.findByBuyerEmailAndStatus(userEmail, status);
    }
}
