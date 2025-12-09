import { useTranslation } from "react-i18next"; 
import { Button } from "@/components/ui/button";
import { FileText, Folder, Users, User, Lightbulb } from "lucide-react";

interface MobileNavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function MobileNavigation({ activeSection, onSectionChange }: MobileNavigationProps) {
  const { t } = useTranslation(); 
  const navItems = [
    { id: "write", label: t('nav.write'), icon: FileText },
    { id: "library", label: t('nav.library'), icon: Folder },
    { id: "inspirations", label: t('nav.inspirations'), icon: Lightbulb },
    { id: "community", label: t('nav.community'), icon: Users },
    { id: "profile", label: t('nav.profile'), icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border md:hidden z-40">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              className={`flex flex-col items-center p-3 h-auto ${
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => onSectionChange(item.id)}
              data-testid={`nav-mobile-${item.id}`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
