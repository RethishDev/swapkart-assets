package com.game.GuessTheNumber.model;

public class GameSession {
	private int targetNumber;
    private int attempts;

    public GameSession() {
        this.targetNumber = (int) (Math.random() * 100) + 1;
        this.attempts = 0;
    }

    public int getTargetNumber() {
        return targetNumber;
    }

    public int getAttempts() {
        return attempts;
    }

    public void incrementAttempts() {
        this.attempts++;
    }
}
