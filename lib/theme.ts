import { ThemeExpansion } from './types';

/**
 * Expand a theme into narrative clusters with search queries
 * IMPROVED: More focused queries that actually use the theme
 */
export function expandTheme(theme: string): ThemeExpansion {
  const normalizedTheme = theme.toLowerCase().trim();
  
  // Generate clusters with theme-specific queries
  const clusters = [
    // Cluster 1: Direct theme search
    {
      name: `${theme} Insights`,
      keywords: [normalizedTheme, ...normalizedTheme.split(/\s+/)],
      search_queries: [
        normalizedTheme,
        `${normalizedTheme} 2024`,
        `${normalizedTheme} 2025`,
      ],
    },
    
    // Cluster 2: How-to / Educational
    {
      name: `How to ${theme}`,
      keywords: [normalizedTheme, 'guide', 'tutorial', 'learn', 'tips'],
      search_queries: [
        `how to ${normalizedTheme}`,
        `${normalizedTheme} guide`,
        `${normalizedTheme} tips`,
      ],
    },
    
    // Cluster 3: Problems & Discussions
    {
      name: `${theme} Discussions`,
      keywords: [normalizedTheme, 'problem', 'issue', 'help', 'question'],
      search_queries: [
        `${normalizedTheme} problems`,
        `${normalizedTheme} help`,
        `${normalizedTheme} reddit`,
      ],
    },
    
    // Cluster 4: News & Updates
    {
      name: `${theme} News`,
      keywords: [normalizedTheme, 'news', 'update', 'announcement', 'latest'],
      search_queries: [
        `${normalizedTheme} news`,
        `${normalizedTheme} update`,
        `${normalizedTheme} announcement`,
      ],
    },
    
    // Cluster 5: Reviews & Opinions
    {
      name: `${theme} Reviews`,
      keywords: [normalizedTheme, 'review', 'opinion', 'experience', 'thoughts'],
      search_queries: [
        `${normalizedTheme} review`,
        `${normalizedTheme} experience`,
        `${normalizedTheme} opinion`,
      ],
    },
  ];
  
  return {
    original: theme,
    clusters,
  };
}

/**
 * Get search queries for a specific platform
 * IMPROVED: Returns the actual theme as first query
 */
export function getPlatformQueries(
  theme: string, 
  platform: 'reddit' | 'x' | 'linkedin'
): string[] {
  const normalizedTheme = theme.trim();
  
  // Always include the raw theme as first query
  const baseQueries = [
    normalizedTheme,
    `${normalizedTheme} 2024`,
    `${normalizedTheme} 2025`,
    `how to ${normalizedTheme}`,
    `${normalizedTheme} tips`,
  ];
  
  // Platform-specific modifications
  switch (platform) {
    case 'reddit':
      return baseQueries;
      
    case 'x':
      // X prefers shorter queries
      return [
        normalizedTheme,
        `${normalizedTheme} tips`,
        `#${normalizedTheme.replace(/\s+/g, '')}`,
      ];
      
    case 'linkedin':
      return baseQueries;
      
    default:
      return baseQueries;
  }
}

/**
 * Find relevant subreddits for a theme
 */
export function suggestSubreddits(theme: string): string[] {
  const normalizedTheme = theme.toLowerCase();
  
  // Common topic -> subreddit mappings
  const subredditMap: Record<string, string[]> = {
    'ai': ['artificial', 'MachineLearning', 'ChatGPT', 'OpenAI', 'LocalLLaMA'],
    'product': ['productmanagement', 'ProductManagement', 'startups', 'SaaS'],
    'marketing': ['marketing', 'digital_marketing', 'socialmedia', 'content_marketing'],
    'startup': ['startups', 'Entrepreneur', 'smallbusiness', 'SaaS'],
    'tech': ['technology', 'programming', 'webdev', 'techcareers'],
    'career': ['careerguidance', 'jobs', 'cscareerquestions', 'techcareers'],
    'coding': ['programming', 'learnprogramming', 'webdev', 'coding'],
    'design': ['design', 'web_design', 'UI_Design', 'userexperience'],
    'saas': ['SaaS', 'startups', 'indiehackers', 'EntrepreneurRideAlong'],
    'crypto': ['CryptoCurrency', 'Bitcoin', 'ethereum', 'defi'],
    'stock': ['stocks', 'investing', 'wallstreetbets', 'IndianStockMarket'],
    'trading': ['trading', 'stocks', 'investing', 'IndianStockMarket'],
    'india': ['india', 'IndianStockMarket', 'indiainvestments', 'bangalore'],
    'zerodha': ['IndianStockMarket', 'indiainvestments', 'india'],
    'finance': ['personalfinance', 'investing', 'stocks', 'FinancialPlanning'],
    'invest': ['investing', 'stocks', 'personalfinance', 'Bogleheads'],
  };
  
  const suggestions: string[] = [];
  
  for (const [keyword, subreddits] of Object.entries(subredditMap)) {
    if (normalizedTheme.includes(keyword)) {
      suggestions.push(...subreddits);
    }
  }
  
  // If no matches, don't return generic defaults - let search handle it
  return [...new Set(suggestions)].slice(0, 5);
}
