package com.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import com.model.User;

public interface UserRepository extends JpaRepository<User, String> {
	Optional<User> findByUsername(String username);
	List<User> findByUsernameAndPassword(String username, String password);
}
