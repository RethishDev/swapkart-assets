package com.game.GuessTheNumber.service;

import org.springframework.stereotype.Service;
import jakarta.servlet.http.HttpSession;

@Service
public class GuessService {

	 public String makeGuess(int number, int min, int max, HttpSession session) {
		    Integer target = (Integer) session.getAttribute("target");
		    if (target == null) {
		        target = (int) (Math.random() * (max - min + 1)) + min;
		        session.setAttribute("target", target);
		    }

		    if (number < target) return "📉 Too low! Try again.";
		    if (number > target) return "📈 Too high! Try again.";
		    return "🎉 Correct! You guessed the number.";
		}

		public void restartGame(int min, int max, HttpSession session) {
		    int newTarget = (int) (Math.random() * (max - min + 1)) + min;
		    session.setAttribute("target", newTarget);
		}
	  
}

