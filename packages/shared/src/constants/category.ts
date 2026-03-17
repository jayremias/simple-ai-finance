export type DefaultSubcategory = {
  key: string;
  name: string;
  icon: string;
};

export type DefaultCategory = {
  key: string;
  name: string;
  icon: string;
  color: string;
  children: DefaultSubcategory[];
};

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    key: 'housing',
    name: 'Housing',
    icon: '🏠',
    color: '#6366F1',
    children: [
      { key: 'housing.rent', name: 'Rent / Mortgage', icon: '🏠' },
      { key: 'housing.utilities', name: 'Utilities', icon: '💡' },
      { key: 'housing.internet', name: 'Internet & Phone', icon: '📡' },
      { key: 'housing.insurance', name: 'Home Insurance', icon: '🛡️' },
      { key: 'housing.maintenance', name: 'Maintenance', icon: '🔧' },
    ],
  },
  {
    key: 'food_dining',
    name: 'Food & Dining',
    icon: '🍽️',
    color: '#F59E0B',
    children: [
      { key: 'food_dining.groceries', name: 'Groceries', icon: '🛒' },
      { key: 'food_dining.restaurants', name: 'Restaurants', icon: '🍴' },
      { key: 'food_dining.delivery', name: 'Delivery', icon: '🛵' },
      { key: 'food_dining.coffee', name: 'Coffee', icon: '☕' },
    ],
  },
  {
    key: 'transportation',
    name: 'Transportation',
    icon: '🚗',
    color: '#3B82F6',
    children: [
      { key: 'transportation.fuel', name: 'Fuel', icon: '⛽' },
      { key: 'transportation.transit', name: 'Public Transit', icon: '🚌' },
      { key: 'transportation.parking', name: 'Parking', icon: '🅿️' },
      { key: 'transportation.insurance', name: 'Car Insurance', icon: '🛡️' },
      { key: 'transportation.maintenance', name: 'Car Maintenance', icon: '🔧' },
      { key: 'transportation.rideshare', name: 'Rideshare / Taxi', icon: '🚕' },
    ],
  },
  {
    key: 'health_fitness',
    name: 'Health & Fitness',
    icon: '💊',
    color: '#10B981',
    children: [
      { key: 'health_fitness.doctor', name: 'Doctor', icon: '🩺' },
      { key: 'health_fitness.pharmacy', name: 'Pharmacy', icon: '💊' },
      { key: 'health_fitness.gym', name: 'Gym', icon: '🏋️' },
      { key: 'health_fitness.mental_health', name: 'Mental Health', icon: '🧠' },
      { key: 'health_fitness.insurance', name: 'Health Insurance', icon: '🛡️' },
    ],
  },
  {
    key: 'entertainment',
    name: 'Entertainment',
    icon: '🎬',
    color: '#8B5CF6',
    children: [
      { key: 'entertainment.streaming', name: 'Streaming', icon: '📺' },
      { key: 'entertainment.games', name: 'Games', icon: '🎮' },
      { key: 'entertainment.movies', name: 'Movies', icon: '🎬' },
      { key: 'entertainment.events', name: 'Events & Concerts', icon: '🎶' },
      { key: 'entertainment.books', name: 'Books', icon: '📚' },
    ],
  },
  {
    key: 'shopping',
    name: 'Shopping',
    icon: '🛍️',
    color: '#EC4899',
    children: [
      { key: 'shopping.clothing', name: 'Clothing', icon: '👕' },
      { key: 'shopping.electronics', name: 'Electronics', icon: '📱' },
      { key: 'shopping.home', name: 'Home & Garden', icon: '🪴' },
      { key: 'shopping.personal_care', name: 'Personal Care', icon: '🪥' },
    ],
  },
  {
    key: 'subscriptions',
    name: 'Subscriptions',
    icon: '🔁',
    color: '#06B6D4',
    children: [
      { key: 'subscriptions.software', name: 'Software & Apps', icon: '💻' },
      { key: 'subscriptions.news', name: 'News & Magazines', icon: '📰' },
      { key: 'subscriptions.other', name: 'Other Subscriptions', icon: '🔁' },
    ],
  },
  {
    key: 'education',
    name: 'Education',
    icon: '🎓',
    color: '#F97316',
    children: [
      { key: 'education.courses', name: 'Courses & Training', icon: '📖' },
      { key: 'education.tuition', name: 'Tuition', icon: '🎓' },
      { key: 'education.supplies', name: 'Books & Supplies', icon: '✏️' },
    ],
  },
  {
    key: 'travel',
    name: 'Travel',
    icon: '✈️',
    color: '#14B8A6',
    children: [
      { key: 'travel.flights', name: 'Flights', icon: '✈️' },
      { key: 'travel.hotels', name: 'Hotels', icon: '🏨' },
      { key: 'travel.activities', name: 'Activities', icon: '🗺️' },
      { key: 'travel.insurance', name: 'Travel Insurance', icon: '🛡️' },
    ],
  },
  {
    key: 'gifts_donations',
    name: 'Gifts & Donations',
    icon: '🎁',
    color: '#F43F5E',
    children: [
      { key: 'gifts_donations.gifts', name: 'Gifts', icon: '🎁' },
      { key: 'gifts_donations.charity', name: 'Charity', icon: '❤️' },
    ],
  },
  {
    key: 'taxes_fees',
    name: 'Taxes & Fees',
    icon: '🧾',
    color: '#64748B',
    children: [
      { key: 'taxes_fees.taxes', name: 'Taxes', icon: '🏛️' },
      { key: 'taxes_fees.bank_fees', name: 'Bank Fees', icon: '🏦' },
      { key: 'taxes_fees.other', name: 'Other Fees', icon: '🧾' },
    ],
  },
  {
    key: 'income',
    name: 'Income',
    icon: '💰',
    color: '#22C55E',
    children: [
      { key: 'income.salary', name: 'Salary', icon: '💵' },
      { key: 'income.freelance', name: 'Freelance', icon: '💻' },
      { key: 'income.investments', name: 'Investment Returns', icon: '📈' },
      { key: 'income.other', name: 'Other Income', icon: '💰' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------

export type CategoryTranslations = Record<string, string>;
export type LocaleTranslations = Record<string, CategoryTranslations>;

export const CATEGORY_TRANSLATIONS: LocaleTranslations = {
  'en-US': {
    housing: 'Housing',
    'housing.rent': 'Rent / Mortgage',
    'housing.utilities': 'Utilities',
    'housing.internet': 'Internet & Phone',
    'housing.insurance': 'Home Insurance',
    'housing.maintenance': 'Maintenance',
    food_dining: 'Food & Dining',
    'food_dining.groceries': 'Groceries',
    'food_dining.restaurants': 'Restaurants',
    'food_dining.delivery': 'Delivery',
    'food_dining.coffee': 'Coffee',
    transportation: 'Transportation',
    'transportation.fuel': 'Fuel',
    'transportation.transit': 'Public Transit',
    'transportation.parking': 'Parking',
    'transportation.insurance': 'Car Insurance',
    'transportation.maintenance': 'Car Maintenance',
    'transportation.rideshare': 'Rideshare / Taxi',
    health_fitness: 'Health & Fitness',
    'health_fitness.doctor': 'Doctor',
    'health_fitness.pharmacy': 'Pharmacy',
    'health_fitness.gym': 'Gym',
    'health_fitness.mental_health': 'Mental Health',
    'health_fitness.insurance': 'Health Insurance',
    entertainment: 'Entertainment',
    'entertainment.streaming': 'Streaming',
    'entertainment.games': 'Games',
    'entertainment.movies': 'Movies',
    'entertainment.events': 'Events & Concerts',
    'entertainment.books': 'Books',
    shopping: 'Shopping',
    'shopping.clothing': 'Clothing',
    'shopping.electronics': 'Electronics',
    'shopping.home': 'Home & Garden',
    'shopping.personal_care': 'Personal Care',
    subscriptions: 'Subscriptions',
    'subscriptions.software': 'Software & Apps',
    'subscriptions.news': 'News & Magazines',
    'subscriptions.other': 'Other Subscriptions',
    education: 'Education',
    'education.courses': 'Courses & Training',
    'education.tuition': 'Tuition',
    'education.supplies': 'Books & Supplies',
    travel: 'Travel',
    'travel.flights': 'Flights',
    'travel.hotels': 'Hotels',
    'travel.activities': 'Activities',
    'travel.insurance': 'Travel Insurance',
    gifts_donations: 'Gifts & Donations',
    'gifts_donations.gifts': 'Gifts',
    'gifts_donations.charity': 'Charity',
    taxes_fees: 'Taxes & Fees',
    'taxes_fees.taxes': 'Taxes',
    'taxes_fees.bank_fees': 'Bank Fees',
    'taxes_fees.other': 'Other Fees',
    income: 'Income',
    'income.salary': 'Salary',
    'income.freelance': 'Freelance',
    'income.investments': 'Investment Returns',
    'income.other': 'Other Income',
  },
  'pt-BR': {
    housing: 'Moradia',
    'housing.rent': 'Aluguel / Financiamento',
    'housing.utilities': 'Contas de Casa',
    'housing.internet': 'Internet & Telefone',
    'housing.insurance': 'Seguro Residencial',
    'housing.maintenance': 'Manutenção',
    food_dining: 'Alimentação',
    'food_dining.groceries': 'Mercado',
    'food_dining.restaurants': 'Restaurantes',
    'food_dining.delivery': 'Delivery',
    'food_dining.coffee': 'Café',
    transportation: 'Transporte',
    'transportation.fuel': 'Combustível',
    'transportation.transit': 'Transporte Público',
    'transportation.parking': 'Estacionamento',
    'transportation.insurance': 'Seguro do Carro',
    'transportation.maintenance': 'Manutenção do Carro',
    'transportation.rideshare': 'Uber / Táxi',
    health_fitness: 'Saúde & Bem-estar',
    'health_fitness.doctor': 'Médico',
    'health_fitness.pharmacy': 'Farmácia',
    'health_fitness.gym': 'Academia',
    'health_fitness.mental_health': 'Saúde Mental',
    'health_fitness.insurance': 'Plano de Saúde',
    entertainment: 'Entretenimento',
    'entertainment.streaming': 'Streaming',
    'entertainment.games': 'Jogos',
    'entertainment.movies': 'Cinema',
    'entertainment.events': 'Eventos & Shows',
    'entertainment.books': 'Livros',
    shopping: 'Compras',
    'shopping.clothing': 'Roupas',
    'shopping.electronics': 'Eletrônicos',
    'shopping.home': 'Casa & Jardim',
    'shopping.personal_care': 'Higiene Pessoal',
    subscriptions: 'Assinaturas',
    'subscriptions.software': 'Software & Apps',
    'subscriptions.news': 'Notícias & Revistas',
    'subscriptions.other': 'Outras Assinaturas',
    education: 'Educação',
    'education.courses': 'Cursos & Treinamentos',
    'education.tuition': 'Mensalidade',
    'education.supplies': 'Livros & Material',
    travel: 'Viagem',
    'travel.flights': 'Passagens',
    'travel.hotels': 'Hotéis',
    'travel.activities': 'Atividades',
    'travel.insurance': 'Seguro Viagem',
    gifts_donations: 'Presentes & Doações',
    'gifts_donations.gifts': 'Presentes',
    'gifts_donations.charity': 'Doações',
    taxes_fees: 'Impostos & Taxas',
    'taxes_fees.taxes': 'Impostos',
    'taxes_fees.bank_fees': 'Tarifas Bancárias',
    'taxes_fees.other': 'Outras Taxas',
    income: 'Receita',
    'income.salary': 'Salário',
    'income.freelance': 'Freelance',
    'income.investments': 'Rendimentos',
    'income.other': 'Outras Receitas',
  },
};

/**
 * Resolves the display name for a category given a locale.
 * Falls back to the canonical `name` if no translation exists.
 */
export function resolveCategoryName(
  name: string,
  translationKey: string | null | undefined,
  locale: string
): string {
  if (!translationKey) return name;
  return CATEGORY_TRANSLATIONS[locale]?.[translationKey] ?? name;
}
