import { Ionicons } from '@expo/vector-icons';
import type { CategoryResponse, CategoryTreeResponse } from '@moneylens/shared';
import { resolveCategoryName } from '@moneylens/shared';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/hooks/useCategories';
import { Colors } from '@/theme/colors';

// ---------------------------------------------------------------------------
// Icon mapping
// ---------------------------------------------------------------------------

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TRANSLATION_KEY_ICONS: Record<string, IoniconsName> = {
  housing: 'home-outline',
  'housing.rent': 'home-outline',
  'housing.utilities': 'flash-outline',
  'housing.internet': 'wifi-outline',
  'housing.insurance': 'shield-checkmark-outline',
  'housing.maintenance': 'construct-outline',
  food_dining: 'restaurant-outline',
  'food_dining.groceries': 'cart-outline',
  'food_dining.restaurants': 'restaurant-outline',
  'food_dining.delivery': 'bicycle-outline',
  'food_dining.coffee': 'cafe-outline',
  transportation: 'car-outline',
  'transportation.fuel': 'flame-outline',
  'transportation.transit': 'bus-outline',
  'transportation.parking': 'stop-circle-outline',
  'transportation.insurance': 'shield-checkmark-outline',
  'transportation.maintenance': 'construct-outline',
  'transportation.rideshare': 'car-outline',
  health_fitness: 'fitness-outline',
  'health_fitness.doctor': 'medkit-outline',
  'health_fitness.pharmacy': 'medical-outline',
  'health_fitness.gym': 'barbell-outline',
  'health_fitness.mental_health': 'leaf-outline',
  'health_fitness.insurance': 'shield-checkmark-outline',
  entertainment: 'film-outline',
  'entertainment.streaming': 'tv-outline',
  'entertainment.games': 'game-controller-outline',
  'entertainment.movies': 'film-outline',
  'entertainment.events': 'musical-notes-outline',
  'entertainment.books': 'book-outline',
  shopping: 'bag-handle-outline',
  'shopping.clothing': 'shirt-outline',
  'shopping.electronics': 'phone-portrait-outline',
  'shopping.home': 'flower-outline',
  'shopping.personal_care': 'cut-outline',
  subscriptions: 'repeat-outline',
  'subscriptions.software': 'laptop-outline',
  'subscriptions.news': 'newspaper-outline',
  'subscriptions.other': 'repeat-outline',
  education: 'school-outline',
  'education.courses': 'school-outline',
  'education.tuition': 'school-outline',
  'education.supplies': 'pencil-outline',
  travel: 'airplane-outline',
  'travel.flights': 'airplane-outline',
  'travel.hotels': 'bed-outline',
  'travel.activities': 'map-outline',
  'travel.insurance': 'shield-checkmark-outline',
  gifts_donations: 'gift-outline',
  'gifts_donations.gifts': 'gift-outline',
  'gifts_donations.charity': 'heart-outline',
  taxes_fees: 'receipt-outline',
  'taxes_fees.taxes': 'business-outline',
  'taxes_fees.bank_fees': 'business-outline',
  'taxes_fees.other': 'receipt-outline',
  income: 'cash-outline',
  'income.salary': 'cash-outline',
  'income.freelance': 'laptop-outline',
  'income.investments': 'trending-up-outline',
  'income.other': 'cash-outline',
};

const FALLBACK_ICON: IoniconsName = 'pricetag-outline';

function getCategoryIcon(cat: {
  translationKey?: string | null;
  icon?: string | null;
}): IoniconsName {
  if (cat.translationKey && TRANSLATION_KEY_ICONS[cat.translationKey]) {
    return TRANSLATION_KEY_ICONS[cat.translationKey] as IoniconsName;
  }
  if (cat.icon) return cat.icon as IoniconsName;
  return FALLBACK_ICON;
}

// Curated icon options for custom categories
const ICON_OPTIONS: IoniconsName[] = [
  'pricetag-outline',
  'home-outline',
  'restaurant-outline',
  'car-outline',
  'fitness-outline',
  'film-outline',
  'bag-handle-outline',
  'repeat-outline',
  'school-outline',
  'airplane-outline',
  'gift-outline',
  'receipt-outline',
  'cash-outline',
  'cart-outline',
  'heart-outline',
  'star-outline',
  'cafe-outline',
  'book-outline',
  'musical-notes-outline',
  'game-controller-outline',
  'laptop-outline',
  'phone-portrait-outline',
  'bicycle-outline',
  'barbell-outline',
  'medkit-outline',
  'map-outline',
  'build-outline',
  'flash-outline',
  'wifi-outline',
  'trending-up-outline',
  'business-outline',
  'shirt-outline',
  'wallet-outline',
  'pizza-outline',
  'beer-outline',
  'bus-outline',
  'train-outline',
  'boat-outline',
  'leaf-outline',
  'flower-outline',
  'paw-outline',
  'cut-outline',
  'pencil-outline',
  'construct-outline',
  'hammer-outline',
  'shield-checkmark-outline',
  'newspaper-outline',
  'tv-outline',
  'headset-outline',
  'camera-outline',
  'color-palette-outline',
  'basketball-outline',
  'football-outline',
  'golf-outline',
  'bicycle-outline',
  'bed-outline',
  'umbrella-outline',
  'flame-outline',
  'water-outline',
  'medkit-outline',
  'bandage-outline',
  'body-outline',
  'happy-outline',
];

const QUICK_ICONS: IoniconsName[] = ICON_OPTIONS.slice(0, 8);

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

const CATEGORY_COLORS = [
  '#2B7EFF',
  '#7B2FBE',
  '#00C896',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
  '#F97316',
  '#8B5CF6',
];

const LOCALE = 'en-US';

function resolveDisplay(cat: CategoryResponse | CategoryTreeResponse) {
  return resolveCategoryName(cat.name, cat.translationKey ?? null, LOCALE);
}

// ---------------------------------------------------------------------------
// Category rows
// ---------------------------------------------------------------------------

function ParentRow({
  cat,
  expanded,
  onPress,
  onToggle,
}: {
  cat: CategoryTreeResponse;
  expanded: boolean;
  onPress: () => void;
  onToggle: () => void;
}) {
  const hasChildren = cat.children.length > 0;
  const iconName = getCategoryIcon(cat);

  return (
    <TouchableOpacity style={styles.parentRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconBadge, { backgroundColor: cat.color ?? Colors.surfaceBg }]}>
          <Ionicons name={iconName} size={18} color={Colors.textPrimary} />
        </View>
        <View>
          <Text style={styles.parentName}>{resolveDisplay(cat)}</Text>
          {hasChildren && (
            <Text style={styles.childCount}>
              {cat.children.length} {cat.children.length === 1 ? 'subcategory' : 'subcategories'}
            </Text>
          )}
        </View>
      </View>
      {hasChildren && (
        <TouchableOpacity onPress={onToggle} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={Colors.textMuted}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

function ChildRow({ cat, onPress }: { cat: CategoryResponse; onPress: () => void }) {
  const iconName = getCategoryIcon(cat);

  return (
    <TouchableOpacity style={styles.childRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.childIndentLine} />
      <View style={styles.childIconBadge}>
        <Ionicons name={iconName} size={14} color={Colors.textSecondary} />
      </View>
      <Text style={styles.childName}>{resolveDisplay(cat)}</Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Form sheet
// ---------------------------------------------------------------------------

type EditTarget =
  | { mode: 'createParent' }
  | { mode: 'createChild'; parentId: string }
  | { mode: 'editParent'; cat: CategoryTreeResponse }
  | { mode: 'editChild'; cat: CategoryResponse };

type FormState = {
  name: string;
  icon: IoniconsName;
  color: string;
};

// ---------------------------------------------------------------------------
// Inline icon picker (expanded panel — no second modal)
// ---------------------------------------------------------------------------

function IconExpandedPicker({
  selected,
  onSelect,
  onCollapse,
}: {
  selected: IoniconsName;
  onSelect: (icon: IoniconsName) => void;
  onCollapse: () => void;
}) {
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? ICON_OPTIONS.filter((name) =>
        name.replace(/-outline$/, '').includes(query.toLowerCase().trim())
      )
    : ICON_OPTIONS;

  return (
    <View style={styles.iconExpandedPanel}>
      <View style={styles.iconExpandedHeader}>
        <Text style={styles.iconExpandedTitle}>All Icons</Text>
        <TouchableOpacity onPress={onCollapse} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-up" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchInputRow}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search icons…"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => setQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {filtered.length === 0 ? (
        <Text style={styles.noResults}>No icons match "{query}"</Text>
      ) : (
        <View style={styles.iconExpandedGrid}>
          {filtered.map((name) => (
            <TouchableOpacity
              key={name}
              style={[styles.iconOption, selected === name && styles.iconOptionActive]}
              onPress={() => {
                onSelect(name);
                onCollapse();
              }}
            >
              <Ionicons
                name={name}
                size={22}
                color={selected === name ? Colors.textPrimary : Colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Form sheet
// ---------------------------------------------------------------------------

function CategoryFormSheet({
  visible,
  target,
  onClose,
}: {
  visible: boolean;
  target: EditTarget | null;
  onClose: () => void;
}) {
  const { mutate: create, isPending: isCreating } = useCreateCategory();
  const { mutate: update, isPending: isUpdating } = useUpdateCategory();
  const { mutate: del, isPending: isDeleting } = useDeleteCategory();

  const isPending = isCreating || isUpdating || isDeleting;
  const [iconExpanded, setIconExpanded] = useState(false);

  function defaultForm(): FormState {
    if (!target) return { name: '', icon: FALLBACK_ICON, color: CATEGORY_COLORS[0] ?? '#2B7EFF' };
    if (target.mode === 'editParent') {
      return {
        name: target.cat.name,
        icon: getCategoryIcon(target.cat),
        color: target.cat.color ?? CATEGORY_COLORS[0] ?? '#2B7EFF',
      };
    }
    if (target.mode === 'editChild') {
      return {
        name: target.cat.name,
        icon: getCategoryIcon(target.cat),
        color: target.cat.color ?? CATEGORY_COLORS[0] ?? '#2B7EFF',
      };
    }
    return { name: '', icon: FALLBACK_ICON, color: CATEGORY_COLORS[0] ?? '#2B7EFF' };
  }

  const [form, setForm] = useState<FormState>(defaultForm);
  const [error, setError] = useState<string | null>(null);

  function handleOpen() {
    setForm(defaultForm());
    setError(null);
    setIconExpanded(false);
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    setError(null);

    const data = { name: form.name.trim(), icon: form.icon, color: form.color };

    if (target?.mode === 'editParent' || target?.mode === 'editChild') {
      update(
        { id: target.cat.id, data },
        {
          onSuccess: handleClose,
          onError: () => setError('Failed to save. Please try again.'),
        }
      );
    } else {
      const parentId = target?.mode === 'createChild' ? target.parentId : undefined;
      create(
        { ...data, parentId },
        {
          onSuccess: handleClose,
          onError: () => setError('Failed to create. Please try again.'),
        }
      );
    }
  }

  function handleDelete() {
    if (!target || (target.mode !== 'editParent' && target.mode !== 'editChild')) return;
    const name = resolveDisplay(target.cat);
    const extra =
      target.mode === 'editParent' && target.cat.children.length > 0
        ? ` This will also delete its ${target.cat.children.length} subcategories.`
        : '';
    Alert.alert('Delete Category', `Delete "${name}"?${extra} This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          del(target.cat.id, {
            onSuccess: handleClose,
            onError: () => setError('Failed to delete. Please try again.'),
          }),
      },
    ]);
  }

  const isEdit = target?.mode === 'editParent' || target?.mode === 'editChild';
  const title =
    target?.mode === 'createParent'
      ? 'New Category'
      : target?.mode === 'createChild'
        ? 'New Subcategory'
        : target?.mode === 'editParent'
          ? 'Edit Category'
          : 'Edit Subcategory';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
      onShow={handleOpen}
    >
      <Pressable style={styles.overlay} onPress={handleClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{title}</Text>
          {isEdit && (
            <TouchableOpacity
              onPress={handleDelete}
              disabled={isPending}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.deleteLink}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="e.g. Food & Dining"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.label}>Icon</Text>
          {iconExpanded ? (
            <IconExpandedPicker
              selected={form.icon}
              onSelect={(icon) => setForm((f) => ({ ...f, icon }))}
              onCollapse={() => setIconExpanded(false)}
            />
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.iconPickerRow}
              >
                {QUICK_ICONS.map((name) => (
                  <TouchableOpacity
                    key={name}
                    style={[styles.iconOption, form.icon === name && styles.iconOptionActive]}
                    onPress={() => setForm((f) => ({ ...f, icon: name }))}
                  >
                    <Ionicons
                      name={name}
                      size={22}
                      color={form.icon === name ? Colors.textPrimary : Colors.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.moreIconsButton}
                  onPress={() => setIconExpanded(true)}
                >
                  <Ionicons name="ellipsis-horizontal" size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
              </ScrollView>
              {!QUICK_ICONS.includes(form.icon) && (
                <View style={styles.selectedIconRow}>
                  <Ionicons name="checkmark-circle" size={14} color={Colors.brandBlue} />
                  <View style={[styles.selectedIconBadge, { backgroundColor: Colors.surfaceBg }]}>
                    <Ionicons name={form.icon} size={20} color={Colors.textPrimary} />
                  </View>
                  <Text style={styles.selectedIconLabel}>Selected</Text>
                </View>
              )}
            </>
          )}

          <Text style={styles.label}>Color</Text>
          <View style={styles.colorRow}>
            {CATEGORY_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c },
                  form.color === c && styles.colorSwatchActive,
                ]}
                onPress={() => setForm((f) => ({ ...f, color: c }))}
              />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.submitButton, isPending && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isPending}
          >
            {isPending && !isDeleting ? (
              <ActivityIndicator color={Colors.textPrimary} size="small" />
            ) : (
              <Text style={styles.submitText}>{isEdit ? 'Save Changes' : 'Create'}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const { data: categories, isLoading, error } = useCategories();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreate() {
    setEditTarget({ mode: 'createParent' });
    setSheetVisible(true);
  }

  function openEditParent(cat: CategoryTreeResponse) {
    setEditTarget({ mode: 'editParent', cat });
    setSheetVisible(true);
  }

  function openEditChild(cat: CategoryResponse) {
    setEditTarget({ mode: 'editChild', cat });
    setSheetVisible(true);
  }

  function openCreateChild(parentId: string) {
    setEditTarget({ mode: 'createChild', parentId });
    setSheetVisible(true);
  }

  type ListItem =
    | { type: 'parent'; cat: CategoryTreeResponse }
    | { type: 'child'; cat: CategoryResponse; parentId: string }
    | { type: 'addChild'; parentId: string };

  const listItems: ListItem[] = [];
  for (const cat of categories ?? []) {
    listItems.push({ type: 'parent', cat });
    if (expanded.has(cat.id)) {
      for (const child of cat.children) {
        listItems.push({ type: 'child', cat: child, parentId: cat.id });
      }
      listItems.push({ type: 'addChild', parentId: cat.id });
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Categories</Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreate}>
          <Ionicons name="add" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.brandBlue} size="large" style={styles.centered} />
      ) : error ? (
        <Text style={[styles.centered, styles.errorText]}>Failed to load categories</Text>
      ) : (
        <FlatList
          data={listItems}
          keyExtractor={(item) => {
            if (item.type === 'addChild') return `add-child-${item.parentId}`;
            return item.cat.id;
          }}
          renderItem={({ item }) => {
            if (item.type === 'parent') {
              return (
                <ParentRow
                  cat={item.cat}
                  expanded={expanded.has(item.cat.id)}
                  onPress={() => openEditParent(item.cat)}
                  onToggle={() => toggleExpand(item.cat.id)}
                />
              );
            }
            if (item.type === 'child') {
              return <ChildRow cat={item.cat} onPress={() => openEditChild(item.cat)} />;
            }
            return (
              <TouchableOpacity
                style={styles.addChildRow}
                onPress={() => openCreateChild(item.parentId)}
              >
                <View style={styles.childIndentLine} />
                <Ionicons name="add-circle-outline" size={16} color={Colors.brandBlue} />
                <Text style={styles.addChildText}>Add subcategory</Text>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="pricetags-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No categories yet</Text>
              <Text style={styles.emptySubtitle}>Tap + to add your first category</Text>
            </View>
          }
        />
      )}

      <CategoryFormSheet
        visible={sheetVisible}
        target={editTarget}
        onClose={() => setSheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.brandBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 2,
  },
  centered: {
    flex: 1,
    textAlign: 'center',
    marginTop: 60,
  },
  // Parent row
  parentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBg,
    borderRadius: 14,
    padding: 14,
    marginVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parentName: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  childCount: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  // Child row
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceBg,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginVertical: 1,
    marginLeft: 16,
    gap: 10,
  },
  childIndentLine: {
    width: 12,
    height: 1,
    backgroundColor: Colors.border,
  },
  childIconBadge: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childName: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  addChildRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginLeft: 16,
    gap: 6,
  },
  addChildText: {
    color: Colors.brandBlue,
    fontSize: 13,
    fontWeight: '500',
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  // Sheet
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: Colors.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sheetTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  deleteLink: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: '500',
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: Colors.surfaceBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconPickerRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingVertical: 2,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.surfaceBg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOptionActive: {
    backgroundColor: Colors.brandBlue,
    borderColor: Colors.brandBlue,
  },
  moreIconsButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.surfaceBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  selectedIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIconLabel: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  // Inline icon expanded panel
  iconExpandedPanel: {
    backgroundColor: Colors.surfaceBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    gap: 10,
  },
  iconExpandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconExpandedTitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  iconExpandedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
    paddingVertical: 9,
  },
  noResults: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 12,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorSwatchActive: {
    borderWidth: 3,
    borderColor: Colors.textPrimary,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    marginTop: 12,
  },
  submitButton: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
