package com.service;

import com.dto.TransactionRequestDTO;
import com.dto.TransactionResponseDTO;
import com.entity.Transaction;
import com.entity.enums.TransactionStatus;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface TransactionService {
    List<TransactionResponseDTO> getSentTransactions(String userEmail);
    List<TransactionResponseDTO> getReceivedTransactions(String userEmail);
    TransactionResponseDTO getTransactionById(String userEmail, Long transactionId);
    TransactionResponseDTO updateTransactionStatus(String userEmail, Long transactionId, String status);
    @Transactional
    TransactionResponseDTO createTransaction(String userEmail, TransactionRequestDTO request);

    List<Transaction> getReceivedTransactionsByStatus(String userEmail, TransactionStatus status);
    List<Transaction> getSentTransactionsByStatus(String userEmail, TransactionStatus status);

    // Admin methods
}