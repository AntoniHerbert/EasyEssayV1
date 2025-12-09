import { useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Essay } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Heart, MessageCircle, Bookmark, Users, Clock, BookOpen, UserPlus, User, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useTranslation } from "react-i18next";

export function CommunityFeed() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["/api/essays", "public", selectedTopic], 
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.append("isPublic", "true");
      if (pageParam) params.append("cursor", pageParam);
      
      if (user?.id) {
        params.append("excludeAuthorId", user.id);
      }

      if (selectedTopic !== "all") {
        params.append("q", selectedTopic);
      }

      const res = await apiRequest("GET", `/api/essays?${params.toString()}`);
      return await res.json();
    },
    getNextPageParam: (lastPage) => {
      return lastPage.nextCursor; 
    },
  });

  const allEssays = data?.pages.flatMap((page) => page.data) || [];

  const { toast } = useToast();


  const toggleLikeMutation = useMutation({
    mutationFn: async (essayId: string) => {
      return apiRequest("POST", `/api/essays/${essayId}/like`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/essays"] });
    },
    onError: () => {
      toast({
        title: t('community.toast.like_failed_title'),
        description: t('community.toast.like_failed_desc'),
        variant: "destructive",
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
        title: t('community.toast.request_sent_title'),
        description: t('community.toast.request_sent_desc'),
      });
    },
    onError: () => {
      toast({
        title: t('community.toast.request_failed_title'),
        description: t('community.toast.request_failed_desc'),
        variant: "destructive",
      });
    },
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getTopicBadge = (title: string, content: string) => {
    const text = (title + " " + content).toLowerCase();
    
    if (text.includes("technology") || text.includes("AI") || text.includes("computer") || text.includes("digital")) {
      return { key: "technology", color: "bg-primary/10 text-primary" };
    } else if (text.includes("environment") || text.includes("climate") || text.includes("sustainability")) {
      return { key: "environment", color: "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100" };
    } else if (text.includes("literature") || text.includes("story") || text.includes("narrative")) {
      return { key: "literature", color: "bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100" };
    } else if (text.includes("science") || text.includes("research") || text.includes("study")) {
      return { key: "science", color: "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100" };
    } else {
      return { key: "general", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100" };
    }
  };

  const getReadingTime = (wordCount: number) => {
    const wordsPerMinute = 200;
    return Math.ceil(wordCount / wordsPerMinute);
  };

  const getAccuracyScore = () => {
    return Math.floor(Math.random() * 10) + 90;
  };

  if (status === 'pending') {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                  <div className="h-6 bg-muted rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-muted rounded w-full mb-2"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">{t('community.header.title')}</h2>
          <p className="text-muted-foreground">{t('community.header.subtitle')}</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <Select value={selectedTopic} onValueChange={setSelectedTopic}>
            <SelectTrigger className="w-[150px]" data-testid="select-topic">
              <SelectValue placeholder={t('community.filters.all_topics')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('community.filters.all_topics')}</SelectItem>
              <SelectItem value="technology">{t('community.filters.technology')}</SelectItem>
              <SelectItem value="science">{t('community.filters.science')}</SelectItem>
              <SelectItem value="literature">{t('community.filters.literature')}</SelectItem>
              <SelectItem value="environment">{t('community.filters.environment')}</SelectItem>
            </SelectContent>
          </Select>
          {/*<Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[150px]" data-testid="select-sort">
              <SelectValue placeholder="Most Recent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="rated">Highest Rated</SelectItem>
            </SelectContent>
          </Select>*/}
        </div>
      </div>

      {/* Essays Feed */}
      {allEssays.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">{t('community.empty.title')}</h3>
            <p className="text-muted-foreground">
              {t('community.empty.desc')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {allEssays
            .map((essay: Essay) => {
            const topic = getTopicBadge(essay.title, essay.content);
            const readingTime = getReadingTime(essay.wordCount);
            const accuracyScore = getAccuracyScore();
            
            return (
              <Card key={essay.id} className="hover:shadow-md transition-shadow" data-testid={`community-essay-${essay.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                          <Avatar>
                            <AvatarImage src= {getInitials(essay.authorName || "User")} alt={essay.authorName} />
                            <AvatarFallback>
                          {    getInitials(essay.authorName || "User")}
                            </AvatarFallback>
                          </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Link href={`/profile/${essay.authorId}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="font-medium hover:text-primary p-0 h-auto"
                            data-testid={`button-author-${essay.authorId}`}
                          >
                            {essay.authorName}
                          </Button>
                        </Link>
                        <span className="text-muted-foreground text-sm">
                          {new Date(essay.updatedAt).toLocaleDateString(i18n.language)}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${topic.color}`}>
                          {t(`community.topics.${topic.key}`)}
                        </span>
                      </div>
                      
                      <Link href={`/essay/${essay.id}`}>
                        <h3 className="text-xl font-semibold mb-3 hover:text-primary cursor-pointer transition-colors break-words" data-testid={`essay-title-${essay.id}`}>
                          {essay.title}
                        </h3>
                      </Link>
                      
                      <p className="text-muted-foreground mb-4 line-clamp-3 break-words">
                        {essay.content.substring(0, 300)}...
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{readingTime} {t('community.card.min_read')}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <BookOpen className="w-4 h-4" />
                            <span>{essay.wordCount} {t('community.card.words')}</span>
                          </div>{/* 
                          <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <span>{accuracyScore}% accuracy</span>
                          </div>*/}
                        </div>{/* 
                        <div className="flex items-center space-x-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleLikeMutation.mutate(essay.id)}
                            disabled={toggleLikeMutation.isPending}
                            className="text-muted-foreground hover:text-red-500 transition-colors"
                            data-testid={`button-like-${essay.id}`}
                          >
                            <Heart className="w-4 h-4 mr-1" />
                            <span className="text-sm">
                              {Math.floor(Math.random() * 100) + 10}
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-primary transition-colors"
                            data-testid={`button-comment-${essay.id}`}
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            <span className="text-sm">
                              {Math.floor(Math.random() * 20) + 1}
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground"
                            data-testid={`button-bookmark-${essay.id}`}
                          >
                            <Bookmark className="w-4 h-4" />
                          </Button>
                        </div>*/}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {/* Load More Button */}
{hasNextPage && (
            <div className="text-center py-4">
              <Button 
                variant="secondary" 
                size="lg" 
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                data-testid="button-load-more"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  t('community.load_more')
                )}
              </Button>
            </div>
          )}
          
          {!hasNextPage && allEssays.length > 0 && (
             <p className="text-center text-muted-foreground text-sm mt-4">
               {t('community.end_of_list')}
             </p>
          )}
        </div>
      )}

      </div>
  );
}
