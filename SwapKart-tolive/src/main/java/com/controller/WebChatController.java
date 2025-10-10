package com.controller;

import com.dto.ChatRoomDto;
import com.entity.ChatRoom;
import com.entity.User;
import com.service.ChatService;
import com.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequestMapping("/chat")
@RequiredArgsConstructor
public class WebChatController {

    private final ChatService chatService;
    private final UserService userService;

    @GetMapping("")
    public String chatHome(Model model, Authentication authentication) {
        User currentUser = userService.getCurrentUser(authentication);
        List<ChatRoomDto> chatRooms = chatService.getUserChatRooms(currentUser.getId());
        
        model.addAttribute("currentUser", currentUser);
        model.addAttribute("chatRooms", chatRooms);
        return "chat/home";
    }

    @GetMapping("/{roomId}")
    public String chatRoom(@PathVariable Long roomId, Model model, Authentication authentication) {
        User currentUser = userService.getCurrentUser(authentication);
        ChatRoomDto chatRoom = chatService.getChatRoom(roomId, currentUser.getId());
        List<ChatRoomDto> chatRooms = chatService.getUserChatRooms(currentUser.getId());
        
        model.addAttribute("currentUser", currentUser);
        model.addAttribute("chatRoom", chatRoom);
        model.addAttribute("chatRooms", chatRooms);
        return "chat/room";
    }
}
