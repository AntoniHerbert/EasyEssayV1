import { useState, useEffect, useRef } from "react";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type UserProfile, type UserMessage, type Friendship } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Edit, 
  Mail, 
  Users, 
  TrendingUp, 
  Award, 
  Calendar,
  MessageSquare,
  UserPlus,
  Check,
  X,
  Crown,
  Target,
  Zap,
  Search,
  Settings,
  Languages
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ConversationList } from "@/components/conversation-list";
import { ConversationThread } from "@/components/conversation-thread";
import { Link } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { io, Socket } from "socket.io-client";
import { useDebounce } from "@/hooks/use-debounce";
import { LanguageSelector } from "./LanguageSelector";
import { useTranslation } from "react-i18next"; 

export function UserProfile() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    bio: "",
    username: "",
  });
  const [selectedConversationUserId, setSelectedConversationUserId] = useState<string | undefined>();

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null); 

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);

  useEffect(() => {
    const openConversationWith = localStorage.getItem('openConversationWith');
    if (openConversationWith) {
      setSelectedConversationUserId(openConversationWith);
      localStorage.removeItem('openConversationWith');
    }
  }, []);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: [`/api/profile/${user?.id}`],
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: [`/api/messages/${user?.id}`],
  });

  const { data: friendships = [], isLoading: friendshipsLoading } = useQuery({
    queryKey: [`/api/friendships/${user?.id}`],
  });

  const {
      data: usersData,
      fetchNextPage: fetchNextUsers,
      hasNextPage: hasMoreUsers,
      isFetchingNextPage: isFetchingMoreUsers,
      status: usersStatus,
    } = useInfiniteQuery({
      queryKey: ["/api/users", debouncedSearch], 
      initialPageParam: null as string | null,
      queryFn: async ({ pageParam }) => {
        const params = new URLSearchParams();
        if (pageParam) params.append("cursor", pageParam);
        if (debouncedSearch) params.append("q", debouncedSearch);

        const res = await apiRequest("GET", `/api/users?${params.toString()}`);
        return await res.json();
      },
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

  const allUsers = usersData?.pages.flatMap((page) => page.data) || [];

  const usersLoading = usersStatus === 'pending';

  useEffect(() => {
    if (!user?.id) return;

    const socket = io(window.location.origin, {
      path: "/api/socket.io",
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      socket.emit("join", user.id);
    });

    socket.on("new_message", (newMessage: UserMessage) => {
      console.log("Nova mensagem recebida:", newMessage);
      
      queryClient.setQueryData([`/api/messages/${user.id}`], (oldMessages: UserMessage[] | undefined) => {
        if (!oldMessages) return [newMessage];
        if (oldMessages.some(m => m.id === newMessage.id)) return oldMessages;
        return [...oldMessages, newMessage];
      });

    });

    socket.on("friend_request", (data: { message: string }) => {
      console.log("Pedido de amizade recebido:", data);

      toast({
        title: t('user_profile.toast.new_connection'),
        description: data.message || t('user_profile.toast.new_connection_desc'),
        variant: "default",
      });

      queryClient.invalidateQueries({ queryKey: [`/api/friendships/${user.id}`] });

    });

    socket.on("friend_request_accepted", (data) => {
      console.log("Pedido aceito:", data);

      toast({
        title: t('user_profile.toast.request_accepted'),
        description: data.message,
        variant: "default",
      });

      queryClient.invalidateQueries({ queryKey: [`/api/friendships/${user.id}`] });
    });


    return () => {
      socket.disconnect();
    };
  }, [user?.id, queryClient, selectedConversationUserId]);

  useEffect(() => {
    if (profile && typeof profile === 'object' && 'displayName' in profile) {
      const userProfile = profile as UserProfile;
      setProfileForm({
        displayName: userProfile.displayName || "",
        bio: userProfile.bio || "",
        username: userProfile.username || "",
      });
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: typeof profileForm) => {
      if (profile) {
        return apiRequest("PUT", `/api/profile/${user?.id}`, profileData);
      } else {
        return apiRequest("POST", "/api/profile", {
          ...profileData,
          userId: user?.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/profile/${user?.id}`] });
      setIsEditing(false);
      toast({
        title: t('user_profile.toast.profile_updated'),
        description: t('user_profile.toast.profile_updated_desc'),
      });
    },
    onError: () => {
      toast({
        title: t('user_profile.toast.update_failed'),
        description: t('user_profile.toast.update_failed_desc'),
        variant: "destructive",
      });
    },
  });

  const acceptFriendshipMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      return apiRequest("PUT", `/api/friendships/${friendshipId}`, { status: "accepted" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/friendships/${user?.id}`] });
      toast({
        title: t('user_profile.toast.friendship_accepted'),
        description: t('user_profile.toast.friendship_accepted_desc'),
      });
    },
  });

  const sendFriendRequestMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      return apiRequest("POST", "/api/friendships", {
        addresseeId: targetUserId,
        status: "pending"
      });
    },
    onSuccess: () => {
      toast({
        title: t('user_profile.toast.request_sent'),
        description: t('user_profile.toast.request_sent_desc'),
      });
      queryClient.invalidateQueries({ queryKey: [`/api/friendships/${user?.id}`] });
    },
    onError: () => {
      toast({
        title: t('user_profile.toast.request_failed'),
        description: t('user_profile.toast.request_failed_desc'),
        variant: "destructive",
      });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return apiRequest("PATCH", `/api/messages/${messageId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${user?.id}`] });
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileForm);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getLevelInfo = (experience: number) => {
    const level = Math.floor(experience / 1000) + 1;
    const currentLevelXP = experience % 1000;
    const xpToNext = 1000 - currentLevelXP;
    return { level, currentLevelXP, xpToNext, progress: (currentLevelXP / 1000) * 100 };
  };

  const getCurrentProfile = (): UserProfile => {
    if (profile && typeof profile === 'object' && 'userId' in profile) {
      return profile as UserProfile;
    }
    return {
      id: "temp-id",
      userId: user?.id || "",
      username: "new_user",
      displayName: "New User",
      bio: "",
      avatar: "",
      totalEssays: 0,
      totalWords: 0,
      averageScore: 0,
      streak: 0,
      level: 1,
      experience: 0,
      joinedAt: new Date(),
      lastActiveAt: new Date(),
    };
  };

  const currentProfile = getCurrentProfile();
  const levelInfo = getLevelInfo(currentProfile.experience);

  if (profileLoading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-20 h-20 bg-muted rounded-full"></div>
              <div className="flex-1">
                <div className="h-6 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/3"></div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={currentProfile.avatar || undefined} alt={currentProfile.displayName} />
                <AvatarFallback className="text-lg font-semibold">
                  {getInitials(currentProfile.displayName)}
                </AvatarFallback>
              </Avatar>
              <div>
                {isEditing ? (
                  <div className="space-y-2">
                    <Input
                      value={profileForm.displayName}
                      onChange={(e) => setProfileForm(prev => ({...prev, displayName: e.target.value}))}
                      placeholder={t('user_profile.header.display_name_placeholder')}
                      className="font-semibold text-lg"
                      data-testid="input-display-name"
                    />
                    <Input
                      value={profileForm.username}
                      onChange={(e) => setProfileForm(prev => ({...prev, username: e.target.value}))}
                      placeholder={t('user_profile.header.username_placeholder')}
                      className="text-sm"
                      data-testid="input-username"
                    />
                  </div>
                ) : (
                  <div>
                    <h2 className="text-2xl font-bold">{currentProfile.displayName}</h2>
                    <p className="text-muted-foreground">@{currentProfile.username}</p>
                  </div>
                )}
                {/*}
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Level {levelInfo.level}
                  </Badge>
                  <Badge variant="outline">
                    <Zap className="w-3 h-3 mr-1" />
                    {currentProfile.streak} day streak
                  </Badge>
                </div>*/}
              </div>
            </div>
            <Button
              variant={isEditing ? "default" : "outline"}
              onClick={isEditing ? handleSaveProfile : () => setIsEditing(true)}
              disabled={updateProfileMutation.isPending}
              data-testid={isEditing ? "button-save-profile" : "button-edit-profile"}
            >
              {isEditing ? <Check className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
              <span className="hidden sm:inline">
                {isEditing ? (updateProfileMutation.isPending ? t('user_profile.header.saving') : t('user_profile.header.save')) : t('user_profile.header.edit')}
              </span>
            </Button>
          </div>

          {/* Bio Section */}
          <div className="mb-6">
            {isEditing ? (
              <Textarea
                value={profileForm.bio}
                onChange={(e) => setProfileForm(prev => ({...prev, bio: e.target.value}))}
                placeholder={t('user_profile.header.bio_placeholder')}
                className="min-h-[80px]"
                data-testid="textarea-bio"
              />
            ) : (
              <p className="text-muted-foreground">
                {currentProfile.bio || t('user_profile.header.no_bio')}
              </p>
            )}
          </div>

          {/* Progress Bar */}
          {/*
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Level Progress</span>
              <span className="text-sm text-muted-foreground">
                {levelInfo.currentLevelXP} / 1000 XP
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${levelInfo.progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {levelInfo.xpToNext} XP to next level
            </p>
          </div> */}

          {/* Stats Grid */}
          {/* 
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Target className="w-6 h-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{currentProfile.totalEssays}</div>
              <div className="text-sm text-muted-foreground">Essays</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">{currentProfile.totalWords.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Words</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Award className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
              <div className="text-2xl font-bold">{currentProfile.averageScore}%</div>
              <div className="text-sm text-muted-foreground">Avg Score</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Calendar className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold">
                {Math.floor((Date.now() - new Date(currentProfile.joinedAt).getTime()) / (1000 * 60 * 60 * 24))}
              </div>
              <div className="text-sm text-muted-foreground">Days</div>
            </div>
          </div>*/}
        </CardContent>
      </Card>

      {/* Tabs for Messages and Friends */}
      <Tabs defaultValue="messages" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <Mail className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t('user_profile.tabs.messages')}</span> 
              <span className="ml-0 sm:ml-2">
                ({(messages as UserMessage[]).filter(m => !m.isRead && m.toUserId === user?.id).length})
            </span>          
            </TabsTrigger>
          <TabsTrigger value="friends" className="flex items-center gap-2">
            <Users className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t('user_profile.tabs.friends')}</span> 
              <span className="ml-0 sm:ml-2">
                ({(friendships as Friendship[]).filter(f => f.status === "accepted").length})
            </span>
            </TabsTrigger>
          <TabsTrigger value="discover" className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">{t('user_profile.tabs.discover')}</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2 shrink-0">
            <Settings className="w-4 h-4" />
           <span className="hidden sm:inline">{t('user_profile.tabs.settings')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Messages Tab */}
        <TabsContent value="messages">
          <Card>
            <CardContent className="p-0">
              {messagesLoading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-start space-x-3 p-3 animate-pulse">
                      <div className="w-10 h-10 bg-muted rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-3/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid md:grid-cols-[350px_1fr] h-[600px]">
                  {/* Conversation List */}
                  <div className={`border-r overflow-y-auto p-4 ${selectedConversationUserId ? 'hidden md:block' : ''}`}>
                    <h3 className="text-lg font-semibold mb-4">{t('user_profile.messages.title')}</h3>
                    <ConversationList
                      messages={messages as UserMessage[]}
                      currentUserId={user?.id || ""}
                      users={allUsers as UserProfile[]}
                      onSelectConversation={setSelectedConversationUserId}
                      selectedUserId={selectedConversationUserId}
                    />
                  </div>
                  
                  {/* Conversation Thread */}
                  <div className={`${!selectedConversationUserId ? 'hidden md:flex' : 'flex'} flex-col h-full overflow-hidden`}>
                    {selectedConversationUserId ? (
                      <ConversationThread
                        currentUserId={user?.id || ""}
                        otherUserId={selectedConversationUserId}
                        otherUserProfile={(allUsers as UserProfile[]).find(u => u.userId === selectedConversationUserId)}
                        messages={messages as UserMessage[]}
                        onBack={() => setSelectedConversationUserId(undefined)}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center">
                          <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <p>{t('user_profile.messages.empty')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Friends Tab */}
        <TabsContent value="friends">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <h3 className="text-lg font-semibold">{t('user_profile.friends.title')}</h3>
            </CardHeader>
            <CardContent>
              {friendshipsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between p-3 animate-pulse">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-muted rounded-full"></div>
                        <div>
                          <div className="h-4 bg-muted rounded w-24 mb-1"></div>
                          <div className="h-3 bg-muted rounded w-16"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (friendships as Friendship[]).length === 0 ? (
                <div className="text-center py-8">
                  <UserPlus className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">{t('user_profile.friends.no_friends')}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('user_profile.friends.connect_hint')}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(friendships as Friendship[]).map((friendship) => {
                    const otherUserId = friendship.requesterId === user?.id 
                      ? friendship.addresseeId 
                      : friendship.requesterId;
                    const friendProfile = (allUsers as UserProfile[]).find(u => u.userId === otherUserId);
                    
                    return (
                      <div
                        key={friendship.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                        data-testid={`friendship-${friendship.id}`}
                      >
                        <Link href={`/profile/${otherUserId}`} className="flex items-center space-x-3 hover:opacity-80 transition-opacity flex-1" data-testid={`link-profile-${otherUserId}`}>
                          <Avatar>
                            <AvatarImage src={friendProfile?.avatar || undefined} alt={friendProfile?.displayName} />
                            <AvatarFallback>
                              {getInitials(friendProfile?.displayName || "User")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{friendProfile?.displayName || "Unknown User"}</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {friendship.status === 'pending' ? t('user_profile.friends.pending') : t('user_profile.friends.accepted')}
                            </p>
                          </div>
                        </Link>
                        <div className="flex space-x-2">
                          {friendship.status === "pending" && friendship.addresseeId === user?.id && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => acceptFriendshipMutation.mutate(friendship.id)}
                                disabled={acceptFriendshipMutation.isPending}
                                data-testid={`button-accept-${friendship.id}`}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                data-testid={`button-decline-${friendship.id}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {friendship.status === "accepted" && (
                            <Badge variant="secondary">{t('user_profile.friends.accepted')}</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discover Tab */}
        <TabsContent value="discover">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">{t('user_profile.discover.title')}</h3>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('user_profile.discover.search_placeholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                    data-testid="input-user-search"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex items-center space-x-4 p-4 animate-pulse">
                      <div className="w-12 h-12 bg-muted rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                      <div className="w-20 h-8 bg-muted rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {(allUsers)
                    .filter(profileUser => profileUser.userId !== user?.id)
                    .map((profileUser: UserProfile) => {
                      const existingFriendship = (friendships as Friendship[]).find(f => 
                        (f.requesterId === profileUser.userId && f.addresseeId === user?.id) ||
                        (f.addresseeId === profileUser.userId && f.requesterId === user?.id)
                      );
                      
                      return (
                        <div key={profileUser.userId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50" data-testid={`user-card-${profileUser.userId}`}>
                          <Link href={`/profile/${profileUser.userId}`} className="flex items-center space-x-4 hover:opacity-80 transition-opacity flex-1 min-w-0 mr-2" data-testid={`link-profile-${profileUser.userId}`}>
                            <Avatar className="w-12 h-12 shrink-0">
                              <AvatarImage src={profileUser.avatar || ""} alt={profileUser.displayName} />
                              <AvatarFallback>
                                {profileUser.displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold truncate">{profileUser.displayName}</h4>
                              <p className="text-sm text-muted-foreground truncate">@{profileUser.username}</p>
                              <div className="flex items-center space-x-4 mt-1">
                               {/*} <span className="text-xs text-muted-foreground">
                                  {profileUser.totalEssays} essays
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Level {profileUser.level}
                                </span>*/}
                              </div>
                            </div>
                          </Link>
                          <div className="flex items-center space-x-2 shrink-0">
                            {existingFriendship ? (
                              existingFriendship.status === "accepted" ? (
                                <Badge variant="secondary">{t('user_profile.friends.accepted')}</Badge>
                              ) : existingFriendship.status === "pending" ? (
                                <Badge variant="outline">{t('user_profile.friends.pending')}</Badge>
                              ) : null
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => sendFriendRequestMutation.mutate(profileUser.userId)}
                                disabled={sendFriendRequestMutation.isPending}
                                className="flex items-center gap-1"
                                data-testid={`button-add-friend-${profileUser.userId}`}
                              >
                                <UserPlus className="w-4 h-4" />
                                <span className="hidden sm:inline">{t('user_profile.discover.connect')}</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  {allUsers.length === 0 && (
                    <div className="text-center py-8">
                      <UserPlus className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">
                        {searchQuery ? t('user_profile.discover.no_results') : t('user_profile.discover.no_users')}
                      </p>
                    </div>
                  )}
                  {hasMoreUsers && (
                    <div className="text-center pt-4">
                      <Button 
                        variant="secondary" 
                        size="lg" 
                        onClick={() => fetchNextUsers()}
                        disabled={isFetchingMoreUsers}
                        data-testid="button-load-more-users"
                      >
                        {isFetchingMoreUsers ? t('common.loading') : t('user_profile.discover.load_more')}
                      </Button>
                    </div>
                  )}
                  
                  {!hasMoreUsers && allUsers.length > 0 && (
                     <p className="text-center text-muted-foreground text-sm mt-4">{t('user_profile.discover.end_list')}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <h3 className="text-lg font-semibold">{t('user_profile.settings.title')}</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Theme Settings */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">{t('user_profile.settings.appearance.title')}</h4>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-muted rounded-md">
                        <Settings className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t('user_profile.settings.appearance.theme')}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('user_profile.settings.appearance.theme_desc')}
                        </p>
                      </div>
                    </div>
                    <ThemeToggle />
                  </div>
                </div>

                {/* User Preferences */}

                <div className="space-y-3">
    <h4 className="text-sm font-medium">{t('user_profile.settings.preferences.title')}</h4>
    <div className="space-y-2">
      
      {/* Opção de Idioma */}
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-muted rounded-md">
            <Languages className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium">{t('user_profile.settings.preferences.language')}</p>
            <p className="text-xs text-muted-foreground">
              {t('user_profile.settings.preferences.language_desc')}
            </p>
          </div>
        </div>
        {/* Componente Seletor */}
        <LanguageSelector /> 
      </div>

    </div>
  </div>

                {/* 
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Preferences</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-muted rounded-md">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Email Notifications</p>
                          <p className="text-xs text-muted-foreground">
                            Receive updates about your essays and messages
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>*/}

                {/* Account Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">{t('user_profile.settings.account.title')}</h4>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={async () => {
                      await logout();
                      window.location.href = '/login';
                    }}
                    data-testid="button-logout"
                  >
                    {t('user_profile.settings.account.sign_out')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}