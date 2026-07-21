import React from 'react';
import { Text } from 'react-native';
import { resolveName } from '../utils/formatters';

/**
 * UserBadge — Design System Component
 * Resolves raw user objects or IDs into safe display names.
 * Uses formatters internally to abstract presentation concerns.
 */
export const UserBadge = ({ userObj, preResolvedName = '', role = 'User', style, numberOfLines = 1, ...props }) => {
  const displayName = resolveName(userObj, preResolvedName, role);

  return (
    <Text style={style} numberOfLines={numberOfLines} {...props}>
      {displayName}
    </Text>
  );
};

export default UserBadge;
