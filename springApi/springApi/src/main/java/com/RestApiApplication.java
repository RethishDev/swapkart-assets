package com;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ApplicationContext;

@SpringBootApplication
public class RestApiApplication {

	public static void main(String[] args) {
		ApplicationContext ctx = SpringApplication.run(RestApiApplication.class, args);

		// Debug: List all registered controllers
		String[] beanNames = ctx.getBeanDefinitionNames();
		for (String name : beanNames) {
			if (name.toLowerCase().contains("controller")) {
				//System.out.println("🧩 Found controller: " + name);
			}
		}
	}

}
