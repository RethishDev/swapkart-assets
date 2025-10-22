# Use the official OpenJDK image
FROM openjdk:21-jdk-slim

# Set the working directory in the container
WORKDIR /myApp

# Copy the jar file into the container
COPY target/*.jar app.jar

# Expose the port your Spring Boot app runs on
EXPOSE 8903

# Command to run the app
ENTRYPOINT ["java", "-jar", "app.jar"]