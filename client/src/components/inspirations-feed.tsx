import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { type Inspiration } from "@shared/schema";
import { Search, BookOpen, Clock, User, Tag, Filter } from "lucide-react";
import { useTranslation } from "react-i18next"; 

export function InspirationsFeed() {
  const { t } = useTranslation(); 
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");

  const { data: inspirations = [], isLoading } = useQuery({
    queryKey: ["/api/inspirations"],
  });

  const filteredInspirations = (inspirations as Inspiration[]).filter((inspiration) => {
    const matchesSearch = 
      inspiration.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspiration.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspiration.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspiration.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || inspiration.category === selectedCategory;
    const matchesType = selectedType === "all" || inspiration.type === selectedType;
    const matchesDifficulty = selectedDifficulty === "all" || inspiration.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesType && matchesDifficulty;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "literature":
        return "bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100";
      case "science":
        return "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100";
      case "philosophy":
        return "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100";
      case "technology":
        return "bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100";
      case "environment":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-100";
      case "history":
        return "bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-800";
      case "intermediate":
        return "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-800";
      case "advanced":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-800";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-1/2 mb-3"></div>
                  <div className="h-4 bg-muted rounded w-full mb-2"></div>
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
          <h2 className="text-2xl font-bold mb-2">{t('inspirations.header.title')}</h2>
          <p className="text-muted-foreground">{t('inspirations.header.subtitle')}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('inspirations.filters.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2"
            data-testid="input-search-inspirations"
          />
        </div>
        
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[140px]" data-testid="select-category">
              <SelectValue placeholder={t('inspirations.filters.category')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('inspirations.filters.all_categories')}</SelectItem>
              <SelectItem value="literature">{t('inspirations.categories.literature')}</SelectItem>
              <SelectItem value="science">{t('inspirations.categories.science')}</SelectItem>
              <SelectItem value="philosophy">{t('inspirations.categories.philosophy')}</SelectItem>
              <SelectItem value="technology">{t('inspirations.categories.technology')}</SelectItem>
              <SelectItem value="environment">{t('inspirations.categories.environment')}</SelectItem>
              <SelectItem value="history">{t('inspirations.categories.history')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[120px]" data-testid="select-type">
              <SelectValue placeholder={t('inspirations.filters.type')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('inspirations.filters.all_types')}</SelectItem>
              <SelectItem value="book">{t('inspirations.types.book')}</SelectItem>
              <SelectItem value="article">{t('inspirations.types.article')}</SelectItem>
              <SelectItem value="quote">{t('inspirations.types.quote')}</SelectItem>
              <SelectItem value="excerpt">{t('inspirations.types.excerpt')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
            <SelectTrigger className="w-[130px]" data-testid="select-difficulty">
              <SelectValue placeholder={t('inspirations.filters.difficulty')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('inspirations.filters.all_levels')}</SelectItem>
              <SelectItem value="beginner">{t('inspirations.difficulties.beginner')}</SelectItem>
              <SelectItem value="intermediate">{t('inspirations.difficulties.intermediate')}</SelectItem>
              <SelectItem value="advanced">{t('inspirations.difficulties.advanced')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {t('inspirations.filters.showing', { count: filteredInspirations.length, total: inspirations.length })}
        </p>
        <Button variant="outline" size="sm" data-testid="button-clear-filters" 
          onClick={() => {
            setSearchQuery("");
            setSelectedCategory("all");
            setSelectedType("all");
            setSelectedDifficulty("all");
          }}>
          <Filter className="w-4 h-4 mr-2" />
          {t('inspirations.filters.clear')}
        </Button>
      </div>

      {/* Inspirations Feed */}
      {filteredInspirations.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">{t('inspirations.empty.title')}</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedCategory !== "all" || selectedType !== "all" || selectedDifficulty !== "all"
                ? t('inspirations.empty.desc_search')
                : t('inspirations.empty.desc_default')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredInspirations.map((inspiration) => (
            <Card key={inspiration.id} className="hover:shadow-md transition-shadow" data-testid={`inspiration-card-${inspiration.id}`}>
              <CardContent className="p-6">
<div className="flex flex-col gap-4 mb-4"> 
    
    
    <div className="flex justify-between items-start gap-4">
      <h3 className="text-xl font-semibold break-words pr-2">
        {inspiration.title}
      </h3>
      <Badge className={`${getCategoryColor(inspiration.category)} shrink-0`}> 
        {t(`inspirations.categories.${inspiration.category}`)}
      </Badge>
    </div>
    
    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-muted-foreground">
      <div className="flex items-center gap-1 min-w-fit">
        <User className="w-4 h-4 shrink-0" /> 
        <span className="truncate max-w-[150px]">{inspiration.author}</span>
      </div>
      
      <div className="flex items-center gap-1 min-w-fit">
        <Clock className="w-4 h-4 shrink-0" />
        <span>{inspiration.readTime} {t('inspirations.card.read_time')}</span>
      </div>
      
      <Badge variant="outline" className={getDifficultyColor(inspiration.difficulty)}>
        {t(`inspirations.difficulties.${inspiration.difficulty}`)}
      </Badge>
      
      <span className="capitalize">{t(`inspirations.types.${inspiration.type}`)}</span>
    </div>
  </div>
                
                <div className="prose prose-sm max-w-none mb-4">
                  <div className="whitespace-pre-line text-foreground leading-relaxed">
                    {inspiration.content}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {inspiration.tags.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-muted-foreground" />
                        <div className="flex gap-1 flex-wrap">
                          {inspiration.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {inspiration.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              {t('inspirations.card.more_tags', { count: inspiration.tags.length - 3 })}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {inspiration.source && (
                    <div className="text-xs text-muted-foreground">
                      {t('inspirations.card.source')}: {inspiration.source}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}