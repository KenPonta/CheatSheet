'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle, RefreshCw, SkipForward, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserNotification, NotificationAction, errorService } from '@/lib/error-handling/error-service';

interface NotificationSystemProps {
  sessionId: string;
  onActionExecuted?: (action: NotificationAction, success: boolean) => void;
}

export function NotificationSystem({ sessionId, onActionExecuted }: NotificationSystemProps) {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [executingActions, setExecutingActions] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Subscribe to new notifications
    const unsubscribe = errorService.onNotification((notification) => {
      setNotifications(prev => [...prev, notification]);

      // Auto-hide notifications if specified
      if (notification.autoHide && notification.duration) {
        setTimeout(() => {
          dismissNotification(notification.id);
        }, notification.duration);
      }
    });

    // Load existing notifications for the session
    const session = errorService.getSession(sessionId);
    if (session) {
      setNotifications(session.notifications);
    }

    return unsubscribe;
  }, [sessionId]);

  const dismissNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const executeAction = useCallback(async (notificationId: string, action: NotificationAction) => {
    setExecutingActions(prev => new Set(prev).add(notificationId));

    try {
      const success = await errorService.executeRecovery(sessionId, notificationId, action);
      
      if (success) {
        dismissNotification(notificationId);
      }

      onActionExecuted?.(action, success);
    } catch (error) {
      console.error('Failed to execute action:', error);
      onActionExecuted?.(action, false);
    } finally {
      setExecutingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  }, [sessionId, dismissNotification, onActionExecuted]);

  const getNotificationIcon = (type: UserNotification['type']) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getActionIcon = (action: NotificationAction['action']) => {
    switch (action) {
      case 'retry':
        return <RefreshCw className="h-4 w-4" />;
      case 'skip':
        return <SkipForward className="h-4 w-4" />;
      case 'fallback':
        return <Settings className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getActionVariant = (action: NotificationAction['action']) => {
    switch (action) {
      case 'retry':
        return 'default';
      case 'skip':
        return 'secondary';
      case 'fallback':
        return 'outline';
      case 'cancel':
        return 'destructive';
      default:
        return 'default';
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notifications.map((notification) => (
        <Card 
          key={notification.id} 
          className={`shadow-lg border-l-4 ${
            notification.type === 'error' ? 'border-l-red-500' :
            notification.type === 'warning' ? 'border-l-yellow-500' :
            notification.type === 'success' ? 'border-l-green-500' :
            'border-l-blue-500'
          }`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                {getNotificationIcon(notification.type)}
                <div>
                  <CardTitle className="text-sm font-medium">
                    {notification.title}
                  </CardTitle>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {notification.stage.replace('-', ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {notification.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
              {notification.dismissible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissNotification(notification.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <CardDescription className="text-sm mb-3">
              {notification.message}
            </CardDescription>
            
            {notification.actions && notification.actions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {notification.actions.map((action, index) => (
                  <Button
                    key={index}
                    variant={getActionVariant(action.action)}
                    size="sm"
                    onClick={() => executeAction(notification.id, action)}
                    disabled={executingActions.has(notification.id)}
                    className="text-xs"
                  >
                    {executingActions.has(notification.id) ? (
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      getActionIcon(action.action) && (
                        <span className="mr-1">{getActionIcon(action.action)}</span>
                      )
                    )}
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface NotificationToastProps {
  notification: UserNotification;
  onDismiss: () => void;
  onAction?: (action: NotificationAction) => void;
}

export function NotificationToast({ notification, onDismiss, onAction }: NotificationToastProps) {
  useEffect(() => {
    if (notification.autoHide && notification.duration) {
      const timer = setTimeout(onDismiss, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification.autoHide, notification.duration, onDismiss]);

  return (
    <div className={`
      p-4 rounded-lg shadow-lg border-l-4 bg-white
      ${notification.type === 'error' ? 'border-l-red-500' :
        notification.type === 'warning' ? 'border-l-yellow-500' :
        notification.type === 'success' ? 'border-l-green-500' :
        'border-l-blue-500'}
    `}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2">
          {notification.type === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
          {notification.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
          {notification.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
          {notification.type === 'info' && <Info className="h-5 w-5 text-blue-500" />}
          <div>
            <h4 className="font-medium text-sm">{notification.title}</h4>
            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
          </div>
        </div>
        {notification.dismissible && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      
      {notification.actions && notification.actions.length > 0 && (
        <div className="mt-3 flex space-x-2">
          {notification.actions.map((action, index) => (
            <button
              key={index}
              onClick={() => onAction?.(action)}
              className={`
                px-3 py-1 text-xs rounded font-medium
                ${action.action === 'retry' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                  action.action === 'skip' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' :
                  action.action === 'cancel' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                  'bg-gray-100 text-gray-700 hover:bg-gray-200'}
              `}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}