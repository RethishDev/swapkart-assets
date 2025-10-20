package com.repository;

import com.entity.Rating;
import com.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface RatingRepository extends JpaRepository<Rating, Long> {

    List<Rating> findByRatedUser(User ratedUser);

    List<Rating> findByRater(User rater);

    Optional<Rating> findByRaterAndRatedUser(User rater, User ratedUser);

    Optional<Rating> findByTransactionId(Long transactionId);

    @Query("SELECT AVG(r.score) FROM Rating r WHERE r.ratedUser.id = :userId")
    Double findAverageRatingByRatedUserId(@Param("userId") Long userId);

    @Query("SELECT COUNT(r) FROM Rating r WHERE r.ratedUser.id = :userId")
    int countByRatedUserId(@Param("userId") Long userId);

    @Query("SELECT r FROM Rating r WHERE r.ratedUser.id = :userId ORDER BY r.createdAt DESC")
    List<Rating> findLatestRatingsByRatedUserId(@Param("userId") Long userId);

    boolean existsByRaterIdAndRatedUserId(Long raterId, Long ratedUserId);

    boolean existsByTransactionIdAndRaterId(Long transactionId, Long raterId);

    @Query("SELECT r FROM Rating r WHERE r.transaction.id = :transactionId AND r.rater.id = :raterId")
    Optional<Rating> findByTransactionIdAndRaterId(@Param("transactionId") Long transactionId, @Param("raterId") Long raterId);

    @Modifying
    @Transactional
    @Query("DELETE FROM Rating r WHERE r.transaction.id IN :transactionIds")
    void deleteAllByTransactionIdIn(@Param("transactionIds") List<Long> transactionIds);

    @Modifying
    @Transactional
    @Query("DELETE FROM Rating r WHERE r.transaction.id = :transactionId")
    void deleteByTransactionId(@Param("transactionId") Long transactionId);

    @Modifying
    @Transactional
    @Query("DELETE FROM Rating r WHERE r.rater.id = :raterId")
    void deleteByRaterId(@Param("raterId") Long raterId);

    @Modifying
    @Transactional
    @Query("DELETE FROM Rating r WHERE r.ratedUser.id = :ratedUserId")
    void deleteByRatedUserId(@Param("ratedUserId") Long ratedUserId);
}
