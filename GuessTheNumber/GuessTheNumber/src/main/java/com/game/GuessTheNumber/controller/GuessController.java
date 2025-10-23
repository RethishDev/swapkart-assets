package com.game.GuessTheNumber.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.game.GuessTheNumber.service.GuessService;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/guess")
public class GuessController {

    @Autowired
    private GuessService guessService;

    @PostMapping
    public ResponseEntity<String> guess(@RequestParam int number, HttpSession session) {
        int min = (int) session.getAttribute("min");
        int max = (int) session.getAttribute("max");
        return ResponseEntity.ok(guessService.makeGuess(number, min, max, session));
    }

    @PostMapping("/start")
    public ResponseEntity<String> start(HttpSession session) {
        Integer min = (Integer) session.getAttribute("min");
        Integer max = (Integer) session.getAttribute("max");

        if (min == null || max == null) {
            min = 1;
            max = 100;
            session.setAttribute("min", min);
            session.setAttribute("max", max);
        }

        guessService.restartGame(min, max, session);
        return ResponseEntity.ok("New Game started. Try to guess the number!");
    }

    @PostMapping("/restart")
    public ResponseEntity<String> restart(HttpSession session) {
        int min = (int) session.getAttribute("min");
        int max = (int) session.getAttribute("max");
        guessService.restartGame(min, max, session);
        return ResponseEntity.ok("Game restarted. Try to guess the new number!");
    }

    @PostMapping("/set-range")
    public ResponseEntity<Void> setRange(@RequestParam int min, @RequestParam int max, HttpSession session) {
        session.setAttribute("min", min);
        session.setAttribute("max", max);
        int target = (int) (Math.random() * (max - min + 1)) + min;
        session.setAttribute("target", target);
        return ResponseEntity.ok().build();
    }
}
