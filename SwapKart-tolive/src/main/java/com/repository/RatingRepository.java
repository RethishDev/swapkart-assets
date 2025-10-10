package com.repository;

import com.entity.Rating;
import com.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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
}
