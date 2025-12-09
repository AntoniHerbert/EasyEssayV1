import { useState, useEffect } from "react";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MessageSquare, Star, Users, Eye, Calendar, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { type Essay, type PeerReviewWithProfile, type ReviewCategory, type CorrectionObject } from "@shared/schema";
import { useTranslation } from "react-i18next";

const REVIEW_CATEGORIES_CONFIG: { key: ReviewCategory; color: string }[] = [
  { key: 'grammar', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  { key: 'style', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { key: 'clarity', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { key: 'structure', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  { key: 'content',  color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  { key: 'research', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' }
];

export default function EssayDetail() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [match, params] = useRoute("/essay/:id");
  const essayId = params?.id;
  
  const [selectedText, setSelectedText] = useState("");
  const [selectionRange, setSelectionRange] = useState<{start: number; end: number} | null>(null);
  const [activeCategory, setActiveCategory] = useState<ReviewCategory>('grammar');
  const [correctionComment, setCorrectionComment] = useState("");
  const [categoryScores, setCategoryScores] = useState({
    grammar: 100,
    style: 100,
    clarity: 100,
    structure: 100,
    content: 100,
    research: 100
  });
  const [viewingReviewId, setViewingReviewId] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: essay, isLoading: essayLoading } = useQuery<Essay>({
    queryKey: [`/api/essays/${essayId}`],
    enabled: !!essayId,
  });

  const { 
      data, 
      fetchNextPage, 
      hasNextPage, 
      isFetchingNextPage,
      isLoading: reviewsLoading 
    } = useInfiniteQuery({
      queryKey: [`/api/essays/${essayId}/peer-reviews`],
      enabled: !!essayId,
      initialPageParam: null as string | null,
      queryFn: async ({ pageParam }) => {
        const url = `/api/essays/${essayId}/peer-reviews${pageParam ? `?cursor=${pageParam}` : ''}`;
        const res = await apiRequest("GET", url);
        return await res.json();
      },
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

  const reviews = data?.pages.flatMap((page) => page.data) || [];

  const getOrCreateReviewMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/essays/${essayId}/peer-reviews`, {
        grammarScore: categoryScores.grammar,
        styleScore: categoryScores.style,
        clarityScore: categoryScores.clarity,
        structureScore: categoryScores.structure,
        contentScore: categoryScores.content,
        researchScore: categoryScores.research,
        overallScore: Object.values(categoryScores).reduce((sum, score) => sum + score, 0),
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      setActiveReviewId(data.id);
      queryClient.invalidateQueries({ queryKey: [`/api/essays/${essayId}/peer-reviews`] });
      queryClient.invalidateQueries({ queryKey: [`/api/essays/${essayId}`] });
    },
    onError: (error: any) => {
      toast({
        title: t('essay_detail.toast.cannot_review'),
        description: error?.message || t('essay_detail.toast.cannot_review_own'),
        variant: "destructive",
      });
    },
  });

  const addCorrectionMutation = useMutation({
    mutationFn: async (data: { reviewId: string; correction: CorrectionObject }) => {
      return apiRequest("POST", `/api/peer-reviews/${data.reviewId}/corrections`, data.correction);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/essays/${essayId}/peer-reviews`] });
      setSelectedText("");
      setSelectionRange(null);
      setCorrectionComment("");
      toast({
        title: t('essay_detail.toast.comment_added'),
        description: t('essay_detail.toast.comment_saved'),
      });
    },
    onError: () => {
      toast({
        title: t('essay_detail.toast.comment_failed'),
        description: t('common.try_again') || "Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const selectedStr = selection.toString();
      const range = selection.getRangeAt(0);
      const essayContent = document.getElementById('essay-content');
      
      if (essayContent && essayContent.contains(range.commonAncestorContainer)) {
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(essayContent);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        const start = preCaretRange.toString().length;
        const end = start + selectedStr.length;
        
        setSelectedText(selectedStr);
        setSelectionRange({ start, end });
      }
    }
  };

  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);

  useEffect(() => {
    if (reviews.length > 0 && user?.id) {
      const currentUserReview = reviews.find(r => r.reviewerId === user.id);
      if (currentUserReview) {
        setActiveReviewId(currentUserReview.id);
        setCategoryScores({
          grammar: currentUserReview.grammarScore,
          style: currentUserReview.styleScore,
          clarity: currentUserReview.clarityScore,
          structure: currentUserReview.structureScore,
          content: currentUserReview.contentScore,
          research: currentUserReview.researchScore,
        });
      }
    }
  }, [reviews, user?.id]);

  const handleSubmitCorrection = async () => {
    if (!correctionComment.trim()) {
      toast({
        title: t('essay_detail.toast.missing_info'),
        description: t('essay_detail.toast.missing_comment'),
        variant: "destructive",
      });
      return;
    }

    try {
      let reviewId: string = activeReviewId || "";
      if (!reviewId) {
        const review = await getOrCreateReviewMutation.mutateAsync();
        reviewId = review.id;
      }
      
      await addCorrectionMutation.mutateAsync({
        reviewId,
        correction: {
          category: activeCategory,
          selectedText: selectedText || "",
          textStartIndex: selectionRange?.start || 0,
          textEndIndex: selectionRange?.end || 0,
          comment: correctionComment,
        }
      });
    } catch (error) {
    }
  };

  const handleSubmitReview = async () => {
    if (!allCategoriesReviewed) {
      toast({
        title: t('essay_detail.toast.incomplete'),
        description: t('essay_detail.toast.incomplete_desc'),
        variant: "destructive",
      });
      return;
    }

    if (!activeReviewId) {
      await getOrCreateReviewMutation.mutateAsync();
      toast({
        title: t('essay_detail.toast.submitted'),
        description: t('essay_detail.toast.submitted_desc'),
      });
      return;
    }

    const overallScore = Object.values(categoryScores).reduce((sum, score) => sum + score, 0);
    
    try {
      await apiRequest("PATCH", `/api/peer-reviews/${activeReviewId}`, {
        grammarScore: categoryScores.grammar,
        styleScore: categoryScores.style,
        clarityScore: categoryScores.clarity,
        structureScore: categoryScores.structure,
        contentScore: categoryScores.content,
        researchScore: categoryScores.research,
        overallScore,
        isSubmitted: true,
      });
      
      queryClient.invalidateQueries({ queryKey: [`/api/essays/${essayId}/peer-reviews`] });
      queryClient.invalidateQueries({ queryKey: [`/api/essays/${essayId}`] });
      
      toast({
        title: t('essay_detail.toast.submitted'),
        description: t('essay_detail.toast.submitted_locked'),
      });
    } catch (error) {
      toast({
        title: t('essay_detail.toast.submit_failed'),
        description: t('common.try_again') || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const currentUserReview = reviews.find(r => r.reviewerId === user?.id);
  
  const isReviewSubmitted = currentUserReview?.isSubmitted ?? false;

  const getCategoryCorrections = (category: ReviewCategory) => {
    if (!currentUserReview) return [];
    return currentUserReview.corrections.filter(c => c.category === category);
  };

  const isCategoryReviewed = (category: ReviewCategory) => {
    return categoryScores[category] !== 100;
  };

  const allCategoriesReviewed = REVIEW_CATEGORIES_CONFIG.every(cat => isCategoryReviewed(cat.key));

  const reviewedCategoriesCount = REVIEW_CATEGORIES_CONFIG.filter(cat => isCategoryReviewed(cat.key)).length;
  const reviewProgress = (reviewedCategoriesCount / REVIEW_CATEGORIES_CONFIG.length) * 100;

  const getReviewerName = (review: PeerReviewWithProfile) => {
    if (review.reviewerId === "AI") return "AI";
    return review.reviewerName || "Anonymous Student";
  };

  const renderHighlightedText = (text: string) => {
    if (!viewingReviewId) {
      return <span>{text}</span>;
    }

    const viewingReview = reviews.find(r => r.id === viewingReviewId);
    if (!viewingReview || viewingReview.corrections.length === 0) {
      return <span>{text}</span>;
    }

    const sortedCorrections = [...viewingReview.corrections].sort((a, b) => a.textStartIndex - b.textStartIndex);

    const segments: JSX.Element[] = [];
    let lastIndex = 0;

    sortedCorrections.forEach((correction, idx) => {
      if (correction.textStartIndex > lastIndex) {
        segments.push(
          <span key={`text-${idx}`}>
            {text.substring(lastIndex, correction.textStartIndex)}
          </span>
        );
      }

      const category = REVIEW_CATEGORIES_CONFIG.find(c => c.key === correction.category);
      const highlightClass = category ? category.color : 'bg-yellow-200 dark:bg-yellow-800';

      segments.push(
        <mark
          key={`highlight-${idx}`}
          className={`${highlightClass} px-1 rounded cursor-pointer transition-opacity hover:opacity-80`}
          title={correction.comment}
          data-testid={`highlight-${idx}`}
        >
          {text.substring(correction.textStartIndex, correction.textEndIndex)}
        </mark>
      );

      lastIndex = correction.textEndIndex;
    });

    if (lastIndex < text.length) {
      segments.push(
        <span key="text-end">
          {text.substring(lastIndex)}
        </span>
      );
    }

    return <>{segments}</>;
  };

  if (!match || !essayId) {
    return <div>{t('essay_detail.not_found')}</div>;
  }

  if (essayLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-4 bg-muted rounded w-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const essayData = essay as Essay;
  const isAuthor = essayData?.authorId === user?.id;
  const isEditingReview = !isAuthor && !isReviewSubmitted; 

  let displayScore = 0;
  let scoreLabel = t('essay_detail.scores.no_reviews');

  if (viewingReviewId) {
    const review = reviews.find(r => r.id === viewingReviewId);
    displayScore = review ? review.overallScore : 0;
    scoreLabel = t('essay_detail.scores.selected_review');
  
  } else if (isEditingReview) {
    displayScore = Object.values(categoryScores).reduce((sum, score) => sum + score, 0);
    scoreLabel = t('essay_detail.scores.current_score');

  } else if (reviews.length > 0) {
    displayScore = essayData?.averageScore || 0;
    scoreLabel = t('essay_detail.scores.average', { count: essayData?.reviewCount || 0 });
  }
  const overallScore = Object.values(categoryScores).reduce((sum, score) => sum + score, 0);
  const maxScore = 1200;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
  {/* HEADER INTELIGENTE (GRID REORDER) */}
  <div className="grid grid-cols-[auto_1fr] md:flex md:items-start gap-x-4 gap-y-2 mb-6">
    
    {/* 1. SETA DE VOLTAR 
        Mobile: Fica na Célula 1 (Canto superior esquerdo)
        Desktop: Fica no início do Flex
    */}
    <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="shrink-0">
      <ArrowLeft className="w-4 h-4" />
    </Button>

    {/* 2. CONTEÚDO (TÍTULO + METADADOS) 
        Mobile: 'col-span-2' (ocupa a largura toda) e 'row-start-2' (vai para a linha de baixo)
        Desktop: 'md:col-auto' (volta ao normal) e 'md:flex-1' (ocupa o espaço do meio)
    */}
    <div className="col-span-2 row-start-2 md:col-auto md:row-auto md:flex-1 min-w-0">
      <h1 className="text-2xl md:text-3xl font-bold break-words">{essayData?.title}</h1>
      
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-muted-foreground">
        {/* Autor */}
        <div className="flex items-center gap-2">
          <Avatar className="w-6 h-6">
            <AvatarFallback>
              {essayData?.authorName.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {isAuthor ? (
            <span className="font-medium text-sm pl-2">{essayData?.authorName}</span>
          ) : (
            <Link href={`/profile/${essayData?.authorId}`}>
              <Button variant="ghost" size="sm" className="font-medium hover:text-primary p-0 h-auto ml-2">
                {essayData?.authorName}
              </Button>
            </Link>
          )}
        </div>

        {/* Data */}
        <div className="flex items-center gap-1 whitespace-nowrap">
          <Calendar className="w-4 h-4" />
          <span>{essayData ? new Date(essayData.createdAt).toLocaleDateString(i18n.language) : ''}</span>
        </div>

        {/* Palavras */}
        <div className="flex items-center gap-1 whitespace-nowrap">
          <Eye className="w-4 h-4" />
          <span>{t('essay.words_count', { count: essayData?.wordCount })}</span>
        </div>
      </div>
    </div>

    {/* 3. NOTA (SCORE)
        Mobile: 'col-start-2' (vai para a direita da seta) e 'row-start-1' (força subir para a linha da seta)
        Desktop: 'md:ml-auto' (empurra para a direita no flex)
    */}
    <div className="col-start-2 row-start-1 justify-self-end md:col-auto md:row-auto md:justify-self-auto md:ml-auto text-right pl-2">
      <div className="text-2xl font-bold text-primary">{displayScore}/{maxScore}</div>
      <div className="text-sm text-muted-foreground">{scoreLabel}</div>
    </div>

  </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Essay Content */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('essay_detail.content.title')}</CardTitle>
                {viewingReviewId && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setViewingReviewId(null)}
                    data-testid="clear-highlights"
                  >
                    {t('essay_detail.content.clear_highlights')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div 
                id="essay-content"
                className="prose dark:prose-invert max-w-none break-words leading-relaxed whitespace-pre-wrap cursor-text"
                onMouseUp={handleTextSelection}
                onTouchEnd={handleTextSelection}
                data-testid="essay-content"
              >
                {essayData?.content && renderHighlightedText(essayData.content)}
              </div>
            </CardContent>
          </Card>

          {/* Peer Corrections Display - Filtered by viewing review */}
          {(() => {
            const reviewsToShow = viewingReviewId 
              ? reviews.filter(r => r.id === viewingReviewId)
              : reviews;
            
            const hasComments = reviewsToShow.some(r => r.corrections.length > 0);

            if (!hasComments) return null;

            return (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    {viewingReviewId ? t('essay_detail.comments.selected_title') : t('essay_detail.comments.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {reviewsToShow.map((review) => {
                      if (review.corrections.length === 0) return null;
                      
                      return (
                        <div key={review.id} className="space-y-3 pb-4 border-b last:border-b-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">{t('essay_detail.comments.reviewer')}: {review.reviewerId === "AI" || review.reviewerId === user?.id ? (
                                  getReviewerName(review)
                                ) : (
                                  <Link href={`/profile/${review.reviewerId}`}>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="font-medium hover:text-primary p-0 h-auto ml-1"
                                    >
                                      {getReviewerName(review)}
                                    </Button>
                                  </Link>
                                )}</div>
                              <div className="text-xs text-muted-foreground">
                                {t('essay_detail.scores.overall')}: {review.overallScore}/1200 ({t('essay_detail.comments.count', {count: review.corrections.length})})
                              </div>
                            </div> 
                          </div>
                          
                          <div className="space-y-3">
                            {REVIEW_CATEGORIES_CONFIG.map((cat) => {
                              const categoryCorrections = review.corrections.filter(c => c.category === cat.key);
                              if (categoryCorrections.length === 0) return null;
                              
                              return (
                                <div key={cat.key} className="space-y-2">
                                  <Badge className={cat.color + " text-xs"}>
                                    {t(`essay_detail.categories.${cat.key}.label`)} ({categoryCorrections.length})
                                  </Badge>
                                  <div className="space-y-2 pl-3">
                                    {categoryCorrections.map((correction, idx) => (
                                      <div 
                                        key={idx} 
                                        className="p-2 bg-muted/30 rounded text-sm"
                                        data-testid={`correction-${idx}`}
                                      >
                                        {correction.selectedText && (
                                          <div className="italic mb-1">"{correction.selectedText}"</div>
                                        )}
                                        <p className="text-muted-foreground">{correction.comment}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>

        {/* Review Panel */}
        <div className="space-y-4">
          {essay?.authorId === user?.id ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  {t('essay_detail.panel.your_essay_title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground text-center py-8">
                  <p className="mb-2">This is your essay.</p>
                  <p>{t('essay_detail.panel.your_essay_desc')}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  {t('essay_detail.panel.peer_review_title')}
                </CardTitle>
                {/* Progress Indicator */}
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t('essay_detail.panel.progress', { reviewed: reviewedCategoriesCount, total: REVIEW_CATEGORIES_CONFIG.length })}</span>
                    <span>{Math.round(reviewProgress)}%</span>
                  </div>
                  <Progress value={reviewProgress} className="h-2" />
                </div>
              </CardHeader>
              <CardContent>
              <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as ReviewCategory)} className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-auto">
                  {REVIEW_CATEGORIES_CONFIG.map((cat) => (
                    <TabsTrigger 
                      key={cat.key} 
                      value={cat.key}
                      className="text-xs py-2 relative"
                      data-testid={`tab-${cat.key}`}
                    >
                      <span className="flex items-center gap-1">
                        {t(`essay_detail.categories.${cat.key}.label`).split(' ')[0]}
                        {isCategoryReviewed(cat.key) && (
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                        )}
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {REVIEW_CATEGORIES_CONFIG.map((category) => (
                  <TabsContent key={category.key} value={category.key} className="space-y-4 mt-4">
                    {/* Category Score */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm font-semibold">{t(`essay_detail.categories.${category.key}.label`)}</div>
                          <div className="text-xs text-muted-foreground">{t(`essay_detail.categories.${category.key}.desc`)}</div>
                        </div>
                        <Badge className={category.color}>
                          {categoryScores[category.key]}/200
                        </Badge>
                      </div>
                      <Slider
                        value={[categoryScores[category.key]]}
                        onValueChange={(value) => 
                          !isReviewSubmitted && setCategoryScores(prev => ({ ...prev, [category.key]: value[0] }))
                        }
                        max={200}
                        min={0}
                        step={5}
                        className="w-full"
                        disabled={isReviewSubmitted}
                        data-testid={`slider-${category.key}`}
                      />
                    </div>

                    <Separator />

                    {/* Text Selection & Comment */}
                    <div className="space-y-3">
                      <div className="text-xs text-muted-foreground">
                        {t('essay_detail.panel.comment_instruction')}
                      </div>
                      
                      {selectedText && (
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="text-sm font-medium mb-1">{t('essay_detail.comments.selected_text_label')}</div>
                          <div className="text-sm break-words italic">"{selectedText}"</div>
                        </div>
                      )}
                      
                      <Textarea
                        value={correctionComment}
                        onChange={(e) => setCorrectionComment(e.target.value)}
                        placeholder={isReviewSubmitted ? t('essay_detail.panel.placeholder_locked') : t('essay_detail.panel.placeholder_active')}
                        className="min-h-[80px]"
                        disabled={isReviewSubmitted}
                        data-testid={`comment-${category.key}`}
                      />

                      <Button 
                        onClick={handleSubmitCorrection}
                        disabled={isReviewSubmitted || !correctionComment.trim() || addCorrectionMutation.isPending}
                        className="w-full"
                        size="sm"
                        data-testid={`add-correction-${category.key}`}
                      >
                        {addCorrectionMutation.isPending ? t('essay_detail.panel.btn_adding') : isReviewSubmitted ? t('essay_detail.panel.btn_submitted') : t('essay_detail.panel.btn_add')}
                      </Button>
                    </div>

                    {/* Category Corrections */}
                    {getCategoryCorrections(category.key).length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <div className="text-sm font-medium">{t('essay_detail.comments.your_comments')} ({getCategoryCorrections(category.key).length})</div>
                          {getCategoryCorrections(category.key).map((correction, idx) => (
                            <div key={idx} className="p-2 bg-muted/50 rounded text-xs">
                              {correction.selectedText && (
                                <div className="italic mb-1">"{correction.selectedText}"</div>
                              )}
                              <div className="text-muted-foreground">{correction.comment}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </TabsContent>
                ))}
              </Tabs>

              {/* Submit Review Button */}
              <div className="mt-6 pt-4 border-t space-y-3">
                <div className="text-center">
                  <div className="text-xl font-bold text-primary">{overallScore}/1200</div>
                  <div className="text-xs text-muted-foreground">{t('essay_detail.scores.overall')} ({Math.round((overallScore / 1200) * 100)}%)</div>
                </div>
                {isReviewSubmitted ? (
                  <div className="text-xs text-green-600 text-center font-medium">
                    {t('essay_detail.panel.msg_locked')}
                  </div>
                ) : !allCategoriesReviewed ? (
                  <div className="text-xs text-destructive text-center">
                    {t('essay_detail.panel.msg_incomplete')}
                  </div>
                ) : null}
                <Button 
                  onClick={handleSubmitReview}
                  disabled={isReviewSubmitted || !allCategoriesReviewed || getOrCreateReviewMutation.isPending}
                  className="w-full"
                  data-testid="submit-review"
                >
                  {isReviewSubmitted ? t('essay_detail.panel.submit_locked') : getOrCreateReviewMutation.isPending ? t('essay_detail.panel.submit_loading') : t('essay_detail.panel.submit_action')}
                </Button>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Existing Reviews */}
          {reviews.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {t('essay_detail.community_reviews.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reviews.map((review) => {
                    const isActive = viewingReviewId === review.id;
                    const isAI = review.reviewerId === "AI";
                    const reviewerName = getReviewerName(review);
                    
                    return (
                      <div 
                        key={review.id} 
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          isActive ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                        } ${isAI ? 'border-blue-300 dark:border-blue-700' : ''}`}
                        onClick={() => setViewingReviewId(isActive ? null : review.id)}
                        data-testid={`review-card-${review.id}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-sm font-medium flex items-center gap-2">
                            {isAI ? (
                              <>
                                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                                  🤖 {t('essay_detail.comments.ai_label')}
                                </span>
                                {isActive && <span className="text-primary">({t('essay_detail.comments.viewing')})</span>}
                              </>
                            ) : (
                              <>
                                {reviewerName} {isActive && <span className="text-primary">({t('essay_detail.comments.viewing')})</span>}
                              </>
                            )}
                          </div>
                          <Badge variant={isActive ? "default" : "outline"}>
                            {review.overallScore}/1200
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-xs mb-2">
                          <div>{t('essay_detail.categories.grammar.label').split(' ')[0]}: {review.grammarScore}/200</div>
                          <div>{t('essay_detail.categories.style.label').split(' ')[0]}: {review.styleScore}/200</div>
                          <div>{t('essay_detail.categories.clarity.label').split(' ')[0]}: {review.clarityScore}/200</div>
                          <div>{t('essay_detail.categories.structure.label').split(' ')[0]}: {review.structureScore}/200</div>
                          <div>{t('essay_detail.categories.content.label').split(' ')[0]}: {review.contentScore}/200</div>
                          <div>{t('essay_detail.categories.research.label').split(' ')[0]}: {review.researchScore}/200</div>
                        </div>
                        {review.corrections.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {t('essay_detail.comments.count', { count: review.corrections.length })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {hasNextPage && (
                    <div className="text-center pt-4">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                      >
                        {isFetchingNextPage ? t('common.loading') : t('essay_detail.community_reviews.load_older')}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            
          )}

                   
        </div>
      </div>
    </div>
  );
}
