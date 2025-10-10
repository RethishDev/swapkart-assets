package com;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class SwapKartApplication {

	public static void main(String[] args) {
		SpringApplication.run(SwapKartApplication.class, args);

		System.out.println("Developer: Aiswarya Sunil");
	}

}
