package com.repository;

import com.entity.Activity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ActivityRepository extends JpaRepository<Activity, Long> {
    Page<Activity> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    
    @Query("SELECT a FROM Activity a JOIN a.user u WHERE u.email = :email ORDER BY a.createdAt DESC")
    Page<Activity> findByUserEmailOrderByCreatedAtDesc(@Param("email") String email, Pageable pageable);
}
