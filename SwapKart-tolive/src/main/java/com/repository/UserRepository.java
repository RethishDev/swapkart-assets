package com.repository;

import com.entity.User;
import com.entity.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByMobile(String mobile);
    boolean existsByEmail(String email);
    boolean existsByMobile(String mobile);

    long countByCreatedAtAfter(LocalDateTime date);
    long countByCreatedAtBetween(LocalDateTime startDate, LocalDateTime endDate);

    Page<User> findByEmailContainingIgnoreCaseOrNameContainingIgnoreCase(
            String email, String name, Pageable pageable);

    // New: Find users by role (used by admin to list only non-admin users)
    Page<User> findByRole(UserRole role, Pageable pageable);

    // New: Role-filtered search (search by name or email within a role)
    @org.springframework.data.jpa.repository.Query("SELECT u FROM User u WHERE u.role = :role AND (LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%'))) ")
    Page<User> findByRoleAndSearch(@org.springframework.data.repository.query.Param("role") UserRole role,
                                   @org.springframework.data.repository.query.Param("search") String search,
                                   Pageable pageable);
}