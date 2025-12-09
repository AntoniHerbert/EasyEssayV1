import { useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type Essay } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Edit, Share, MoreVertical, Check, Clock, Globe, FileText, Eye, Trash2, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useDebounce } from "@/hooks/use-debounce";
import { useTranslation } from "react-i18next";

interface EssayLibraryProps {
  onEditEssay?: (essayId: string) => void;
  onViewEssay?: (essayId: string) => void;
}

export function EssayLibrary({ onEditEssay , onViewEssay}: EssayLibraryProps) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const debouncedSearch = useDebounce(searchQuery, 500);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: [`/api/essays`, `library`, `author:${user?.id}`, debouncedSearch], 
    enabled: !!user?.id,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (user?.id) params.append("authorId", user.id);
      if (pageParam) params.append("cursor", pageParam);

      if (debouncedSearch) {
        params.append("q", debouncedSearch);
      }
      
      const res = await apiRequest("GET", `/api/essays?${params.toString()}`);
      return await res.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const allEssays = data?.pages.flatMap((page) => page.data) || [];

  const filteredEssays = (allEssays as Essay[]).filter((essay: Essay) => {
    
    switch (activeFilter) {
      case "drafts":
        return !essay.isAnalyzed && !essay.isPublic;
      case "published":
        return essay.isPublic;
      case "analyzed":
        return essay.isAnalyzed;
      default:
        return true;
    }
  });

  const deleteEssayMutation = useMutation({
    mutationFn: async (essayId: string) => {
      return apiRequest("DELETE", `/api/essays/${essayId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/essays?authorId=${user?.id}`] });
      toast({
        title: t('library.toast.deleted_title'),
        description: t('library.toast.deleted_desc'),
      });
    },
    onError: () => {
      toast({
        title: t('library.toast.delete_failed_title'),
        description: t('library.toast.delete_failed_desc'),
        variant: "destructive",
      });
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ essayId, isPublic }: { essayId: string; isPublic: boolean }) => {
      return apiRequest("PUT", `/api/essays/${essayId}`, { isPublic });
    },
    onSuccess: async (response) => {
      const updatedEssay = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/essays"] });
      toast({
        title: updatedEssay.isPublic ? t('library.toast.published_title') : t('library.toast.unpublished_title'),
        description: updatedEssay.isPublic 
          ? t('library.toast.published_desc')
          : t('library.toast.unpublished_desc'),
      });
    },
    onError: () => {
      toast({
        title: t('library.toast.action_failed_title'),
        description: t('library.toast.action_failed_desc'),
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (essay: Essay) => {
    if (essay.isPublic) {
      return (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 text-xs rounded-full">
          <Globe className="w-3 h-3 mr-1 inline" />
          {t('library.status.published')}
        </span>
      );
    } else if (essay.isAnalyzed) {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 text-xs rounded-full">
          <Check className="w-3 h-3 mr-1 inline" />
          {t('library.status.analyzed')}
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100 text-xs rounded-full">
          <Clock className="w-3 h-3 mr-1 inline" />
          {t('library.status.draft')}
        </span>
      );
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">{t('library.header.title')}</h2>
          <p className="text-muted-foreground">{t('library.header.subtitle')}</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('library.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2"
              data-testid="input-search"
            />
          </div>
          <Button onClick={() => onEditEssay?.("")} data-testid="button-new-essay">
            <Plus className="w-4 h-4 mr-2" />
            {t('library.new_essay')}
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="grid grid-cols-4 gap-1 bg-muted rounded-lg p-1 mb-6 w-fit">
        {[
          { key: "all", label: t('library.filters.all') },
          { key: "drafts", label: t('library.filters.drafts') },
          { key: "published", label: t('library.filters.published') },
          { key: "analyzed", label: t('library.filters.analyzed') },
        ].map((filter) => (
          <Button
            key={filter.key}
            variant={activeFilter === filter.key ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveFilter(filter.key)}
            className={activeFilter === filter.key ? "shadow-sm" : ""}
            data-testid={`filter-${filter.key}`}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Essays Grid */}
      {status === 'pending' ? (
        // Mostra os Skeletons AQUI
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full mb-4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredEssays.length === 0 && !searchQuery && activeFilter === 'all' ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">{t('library.empty.title')}</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? t('library.empty.desc_search') : t('library.empty.desc_default')}
            </p>
            {!searchQuery && (
              <Button onClick={() => onEditEssay?.("")} data-testid="button-create-first">
                <Plus className="w-4 h-4 mr-2" />
                {t('library.empty.create')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEssays.map((essay: Essay) => (
            <Card key={essay.id} className="hover:shadow-md transition-shadow" data-testid={`essay-card-${essay.id}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-lg line-clamp-2 flex-1 mr-2">
                    {essay.title}
                  </h3>
                  <div className="flex items-center space-x-1">
                      {/*<Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1"
                      onClick={() => togglePublishMutation.mutate({
                        essayId: essay.id,
                        isPublic: !essay.isPublic
                      })}
                      disabled={togglePublishMutation.isPending}
                      data-testid={`button-share-${essay.id}`}
                    >
                      <Share className="w-4 h-4" />
                    </Button>
                  
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1"
                      data-testid={`button-menu-${essay.id}`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button> */}
                    <Button
                    variant="ghost" 
                    size="sm"       
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 px-2"
                    disabled={deleteEssayMutation.isPending}
                    onClick={(e) => {
                      e.stopPropagation(); 
                      if (window.confirm(t('library.card.confirm_delete'))) {
                        deleteEssayMutation.mutate(essay.id);
                      }
                    }}
                    data-testid={`button-delete-${essay.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  </div>
                </div>
                
                <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                  {essay.content.substring(0, 150)}...
                </p>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                  <span>{new Date(essay.updatedAt).toLocaleDateString(i18n.language)}</span>
                  <span>{t('library.card.words', { count: essay.wordCount })}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(essay)}
                  </div>
                    {( essay.isAnalyzed) ? (
                      <Button variant="secondary" onClick={() => onViewEssay?.(essay.id)}>
                        <Eye className="w-4 h-4 mr-1" /> {t('library.card.view')}
                      </Button>
                    ) : (
                      <Button variant="ghost" onClick={() => onEditEssay?.(essay.id)}>
                        <Edit className="w-4 h-4 mr-1" /> {t('library.card.edit')}
                      </Button>
                    )}
                </div>
              </CardContent>
            </Card>
          ))}

          {hasNextPage && (
             <div className="text-center col-span-full justify-self-center py-4">
                <Button 
                  variant="secondary" 
                  size="lg" 
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('common.loading')}
                    </>
                  ) : (
                    t('library.load_more')
                  )}
                </Button>
             </div>
          )}  
        </div>
      )}
    </div>
  );
}
