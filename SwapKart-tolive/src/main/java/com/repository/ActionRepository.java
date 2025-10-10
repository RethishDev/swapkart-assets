package com.repository;

import com.entity.Action;
import com.entity.Action.ActionType;
import com.entity.Item;
import com.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ActionRepository extends JpaRepository<Action, Long> {

    List<Action> findByUserAndType(User user, ActionType type);

    List<Action> findByItemAndType(Item item, ActionType type);

    boolean existsByUserAndItemAndType(User user, Item item, ActionType type);

    int countByItemAndType(Item item, ActionType type);

    Optional<Action> findByUserAndItemAndType(User user, Item item, ActionType type);

    void deleteByUserAndItemAndType(User user, Item item, ActionType type);
}
