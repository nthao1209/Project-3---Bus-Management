  'use client';

  import React, { useEffect, useState, useRef } from 'react';
  import type { Socket } from 'socket.io-client';
  import {
    Button,
    Dropdown,
    Avatar,
    MenuProps,
    message,
    Image,
    Badge,
    List,
    Typography,
    Popover,
  } from 'antd';
  import {
    QuestionCircleOutlined,
    UserOutlined,
    LogoutOutlined,
    ProfileOutlined,
    HistoryOutlined,
    MenuOutlined,
    BellOutlined,
  } from '@ant-design/icons';
  import Link from 'next/link';
  import { useRouter } from 'next/navigation';
  import { createSocket } from '@/lib/socketClient';

  type Role = 'user' | 'owner' | 'driver' | 'admin';

  interface UserInfo {
    userId: string;
    email: string;
    name: string;
    role: Role;
  }

  const roleLabelMap: Record<Role, string> = {
    user: 'Khách hàng',
    owner: 'Chủ nhà xe',
    driver: 'Tài xế',
    admin: 'Quản trị viên',
  };

  const roleUI = {
    user: {
      showMyTickets: true,
      showProfile: true,
      dashboard: null,
    },
    owner: {
      showMyTickets: false,
      showProfile: true,
    },
    driver: {
      showMyTickets: false,
      showProfile: true,
    },
    admin: {
      showMyTickets: false,
      showProfile: true,
    },
  };

  export default function Header() {
    const router = useRouter();
    const [user, setUser] = useState<UserInfo | null>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
      const [isLoggingOut, setIsLoggingOut] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    const currentUI = user ? roleUI[user.role] : null;
    const showNotification =
          user && (user.role === 'user' || user.role === 'driver'|| user.role === 'owner');
    const isUser = user?.role === 'user';


    useEffect(() => {
      const loadUser = async () => {
        try {
          const res = await fetch('/api/auth/me', {
            credentials: 'include',
          });
          if (!res.ok) {
            setUser(null);
            return;
          }
          const data = await res.json();
          setUser(data.user || data);
        } catch {
          setUser(null);
        }
      };

      const handleAuthChanged = () => {
        loadUser();
      };

      loadUser();
      window.addEventListener('authChanged', handleAuthChanged);
      return () => window.removeEventListener('authChanged', handleAuthChanged);
    }, []);

    const fetchNotifications = async () => {
      if (!user) return;
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.data || []);
          setUnreadCount(data.data.filter((n: any) => !n.isRead).length);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    useEffect(() => {
      if (user) {
        console.log('[NOTIFICATION] User logged in, setting up notifications for userId:', user.userId);
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
          try {
          console.log('[SOCKET] Connecting to Socket.IO...');
          const s = createSocket();
          socketRef.current = s as Socket;
          s.on('connect', () => {
            console.log('[SOCKET] Connected! Socket ID:', s.id);
            try {
              console.log('[SOCKET] Joining user room:', user.userId);
              s.emit('join_user', user.userId);
            } catch (err) { console.error('[SOCKET] join_user emit error:', err); }
          });

          s.on('joined_user', (data: any) => {
            console.log('[SOCKET] Successfully joined user room:', data);
          });

          s.on('notification', (notif: any) => {
            console.log('[SOCKET] Received notification:', notif);
            try {
              setNotifications(prev => [notif, ...(prev || [])]);
              setUnreadCount(prev => prev + 1);
              message.info(notif.title || 'Thông báo mới');
            } catch (err) { console.error('[SOCKET] notification handler error:', err); }
          });
          s.on('receive_notification', (notif: any) => {
            console.log('[SOCKET] Received admin notification:', notif);
            try {
              setNotifications(prev => [notif, ...(prev || [])]);
              setUnreadCount(prev => prev + 1);
              message.warning({
                content: (
                  <div>
                    <div className="font-bold text-red-600">{notif.title}</div>
                    <div>{notif.message}</div>
                  </div>
                ),
                duration: 5,
              });
            } catch (err) { 
              console.error('[SOCKET] handler error:', err); 
            }
          });

          s.on('disconnect', () => {
            console.log('[SOCKET] Disconnected');
          });

          s.on('connect_error', (err: any) => {
            console.error('[SOCKET] Connection error:', err);
          });
        } catch (err) {
          console.error('[SOCKET] Socket setup error:', err);
        }
        return () => {
          clearInterval(interval);
          if (socketRef.current) {
            console.log('[SOCKET] Cleaning up socket connection');
            try { socketRef.current.disconnect(); } catch (e) {}
            socketRef.current = null;
          }
        };
      }
    }, [user]);

    useEffect(() => {
      return () => {
        if (socketRef.current) {
          console.log('[SOCKET] Component unmount cleanup');
          try { socketRef.current.disconnect(); } catch (e) {}
          socketRef.current = null;
        }
      };
    }, []);

    const markAsRead = async (notificationIds: string[]) => {
      try {
        const res = await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationIds }),
        });
        if (res.ok) {
          setNotifications(prev => prev.map(n => 
            notificationIds.includes(n._id) ? { ...n, isRead: true } : n
          ));
          setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
        }
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    };
    const handleLogout = async () => {
      if (isLoggingOut) return;
      setIsLoggingOut(true);
      try {
        const res = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        if (!res.ok) throw new Error('Logout failed');
        setUser(null);
        window.dispatchEvent(new Event('authChanged'));
        message.success('Đã đăng xuất');
        // navigate to login and refresh to update server components
        router.push('/auth/login');
        try { router.refresh(); } catch (e) {}
      } catch (err) {
        console.error('logout error', err);
        message.error('Đăng xuất thất bại');
      } finally {
        setIsLoggingOut(false);
      }
    };

    const userMenu: MenuProps['items'] = [
    {
      key: 'info',
      label: (
        <div className="flex flex-col">
          <span className="font-bold text-blue-700">{user?.name}</span>
          <span className="text-xs text-gray-500">
            {user && roleLabelMap[user.role]}
          </span>
        </div>
      ),
      icon: <UserOutlined />,
    },
    { type: 'divider' as const },

    ...(currentUI?.showProfile
      ? [
          {
            key: 'profile',
            label: <Link href="/auth/profile">Thông tin tài khoản</Link>,
            icon: <ProfileOutlined />,
          },
          { type: 'divider' as const },
        ]
      : []),

    {
      key: 'logout',
      label: (
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full text-left bg-transparent border-0 p-0"
          style={{ color: isLoggingOut ? 'gray' : undefined }}
        >
          Đăng xuất
        </button>
      ),
      icon: <LogoutOutlined />,
      danger: true,
    },
  ];


    const notificationMenu = (
      <div style={{width: 'min(350px, 90vw)',maxHeight: 400, overflow: 'auto' }}>
        <List
          size="small"
          dataSource={notifications.slice(0, 10)}
          renderItem={(item: any) => (
            <List.Item
              style={{ 
                padding: '12px', 
                backgroundColor: item.isRead ? 'white' : '#f0f8ff',
                cursor: 'pointer'
              }}
              onClick={() => {
                if (!item.isRead) {
                  markAsRead([item._id]);
                }
                if (item.type === 'trip_reminder' && item.data?.tripId) {
                  if (user?.role === 'driver') {
                    router.push(`/driver/trip/${item.data.tripId}`);
                  } else {
                    router.push(`/my-tickets`);
                  }
                }
              }}
            >
              <List.Item.Meta
                title={<Typography.Text strong={!item.isRead}>{item.title}</Typography.Text>}
                description={
                  <div>
                    <Typography.Text>{item.message}</Typography.Text>
                    <br />
                    <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                      {new Date(item.createdAt).toLocaleString('vi-VN')}
                    </Typography.Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
        {notifications.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
            Không có thông báo
          </div>
        )}
        {notifications.length > 10 && (
          <div style={{ padding: '10px', textAlign: 'center' }}>
            <Button type="link" onClick={() => router.push('/notifications')}>
              Xem tất cả
            </Button>
          </div>
        )}
      </div>
    );
   

    return (
      <header className="w-full bg-[#2474E5] text-white sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4 h-[60px] flex items-center justify-between">
          <Link href="/">
            <Image src="/Logo.png" alt="Logo" height={42} preview={false} />
          </Link>

          <div className="flex items-center gap-4">

          {isUser && (
            <Link href="/my-tickets">
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg
                          border border-white/40
                          text-white
                          hover:bg-white/10 hover:border-white
                          cursor-pointer transition"
              >
                <HistoryOutlined />
                <span className="text-sm font-medium hidden md:inline">
                  Đơn hàng của tôi
                </span>
              </div>
            </Link>
          )}

            {showNotification && (
                <Popover
                  content={notificationMenu}
                  trigger="click"
                  placement="bottomRight"
                >
                  <Badge count={unreadCount} offset={[10, 0]}>
                    <Button
                      type="text"
                      icon={<BellOutlined />}
                      className="!text-white hover:!bg-white/10"
                      style={{ border: 'none' }}
                    />
                  </Badge>
                </Popover>
              )}

            {user ? (
              <Dropdown menu={{ items: userMenu }} placement="bottomRight">
                <Avatar className="bg-yellow-400 text-blue-700 font-bold cursor-pointer">
                  {user.email?.charAt(0).toUpperCase() || user.name?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
              </Dropdown>
            ) : (
              <Link href="/auth/login">
                <Button className="!bg-white !text-[#2474E5] font-bold">
                  Đăng nhập
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>
    );
  }
