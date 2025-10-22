package com.repository;

import org.springframework.data.jpa.repository.JpaRepository;


import com.model.UserManger;

public interface UserMangerRepository extends JpaRepository<UserManger, Long> {

	static UserManger findByUsername(String username) {
		
		return null;
	}
	
}
