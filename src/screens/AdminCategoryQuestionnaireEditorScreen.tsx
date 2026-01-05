import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {QuestionnaireQuestion} from '../services/serviceCategoriesAdminService';

interface AdminCategoryQuestionnaireEditorScreenProps {
  route: {
    params: {
      categoryName: string;
      questionnaire: QuestionnaireQuestion[];
      onSave: (questionnaire: QuestionnaireQuestion[]) => void;
    };
  };
  navigation: any;
}

const QUESTION_TYPES = [
  {value: 'text', label: 'Text', icon: 'text-fields'},
  {value: 'number', label: 'Number', icon: 'numbers'},
  {value: 'select', label: 'Select', icon: 'list'},
  {value: 'multiselect', label: 'Multi-Select', icon: 'checklist'},
  {value: 'boolean', label: 'Yes/No', icon: 'toggle-on'},
];

export default function AdminCategoryQuestionnaireEditorScreen({
  route,
  navigation,
}: AdminCategoryQuestionnaireEditorScreenProps) {
  const {categoryName, questionnaire, onSave} = route.params;
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  const [questions, setQuestions] = useState<QuestionnaireQuestion[]>(questionnaire || []);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Form state
  const [question, setQuestion] = useState('');
  const [type, setType] = useState<'text' | 'number' | 'select' | 'multiselect' | 'boolean'>('text');
  const [required, setRequired] = useState(true);
  const [placeholder, setPlaceholder] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [optionInput, setOptionInput] = useState('');

  const resetForm = () => {
    setQuestion('');
    setType('text');
    setRequired(true);
    setPlaceholder('');
    setOptions([]);
    setOptionInput('');
    setEditingIndex(null);
  };

  const handleEdit = (index: number) => {
    const q = questions[index];
    setQuestion(q.question);
    setType(q.type);
    setRequired(q.required);
    setPlaceholder(q.placeholder || '');
    setOptions(q.options || []);
    setEditingIndex(index);
  };

  const handleDelete = (index: number) => {
    Alert.alert('Delete Question', 'Are you sure you want to delete this question?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const updated = questions.filter((_, i) => i !== index);
          setQuestions(updated);
          if (editingIndex === index) {
            resetForm();
          }
        },
      },
    ]);
  };

  const handleAddOrUpdateQuestion = () => {
    if (!question.trim()) {
      Alert.alert('Error', 'Please enter a question');
      return;
    }

    if ((type === 'select' || type === 'multiselect') && options.length === 0) {
      Alert.alert('Error', 'Please add at least one option');
      return;
    }

    const newQuestion: QuestionnaireQuestion = {
      id: editingIndex !== null ? questions[editingIndex].id : `q_${Date.now()}`,
      question: question.trim(),
      type,
      required,
      placeholder: placeholder.trim() || undefined,
      options: (type === 'select' || type === 'multiselect') ? options : undefined,
    };

    if (editingIndex !== null) {
      const updated = [...questions];
      updated[editingIndex] = newQuestion;
      setQuestions(updated);
    } else {
      setQuestions([...questions, newQuestion]);
    }

    resetForm();
  };

  const handleAddOption = () => {
    if (!optionInput.trim()) return;
    if (options.includes(optionInput.trim())) {
      Alert.alert('Error', 'This option already exists');
      return;
    }
    setOptions([...options, optionInput.trim()]);
    setOptionInput('');
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(questions);
    navigation.goBack();
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Question Form */}
        <View style={[styles.section, {backgroundColor: theme.card}]}>
          <Text style={[styles.sectionTitle, {color: theme.text}]}>
            {editingIndex !== null ? 'Edit Question' : 'Add Question'}
          </Text>

          <Text style={[styles.label, {color: theme.text}]}>Question *</Text>
          <TextInput
            style={[styles.input, {backgroundColor: theme.background, color: theme.text}]}
            value={question}
            onChangeText={setQuestion}
            placeholder="Enter your question"
            placeholderTextColor={theme.textSecondary}
            multiline
          />

          <Text style={[styles.label, {color: theme.text}]}>Question Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeList}>
            {QUESTION_TYPES.map(t => (
              <TouchableOpacity
                key={t.value}
                style={[
                  styles.typeOption,
                  {borderColor: theme.border},
                  type === t.value && {
                    backgroundColor: theme.primary + '20',
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() => setType(t.value as any)}>
                <Icon
                  name={t.icon}
                  size={20}
                  color={type === t.value ? theme.primary : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.typeLabel,
                    {color: type === t.value ? theme.primary : theme.text},
                  ]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.label, {color: theme.text}]}>Placeholder</Text>
          <TextInput
            style={[styles.input, {backgroundColor: theme.background, color: theme.text}]}
            value={placeholder}
            onChangeText={setPlaceholder}
            placeholder="Enter placeholder text (optional)"
            placeholderTextColor={theme.textSecondary}
          />

          {(type === 'select' || type === 'multiselect') && (
            <>
              <Text style={[styles.label, {color: theme.text}]}>Options</Text>
              <View style={styles.optionInputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.optionInput,
                    {backgroundColor: theme.background, color: theme.text},
                  ]}
                  value={optionInput}
                  onChangeText={setOptionInput}
                  placeholder="Enter an option"
                  placeholderTextColor={theme.textSecondary}
                  onSubmitEditing={handleAddOption}
                />
                <TouchableOpacity
                  style={[styles.addOptionButton, {backgroundColor: theme.primary}]}
                  onPress={handleAddOption}>
                  <Icon name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
              {options.map((opt, idx) => (
                <View key={idx} style={[styles.optionChip, {backgroundColor: theme.background}]}>
                  <Text style={[styles.optionChipText, {color: theme.text}]}>{opt}</Text>
                  <TouchableOpacity onPress={() => handleRemoveOption(idx)}>
                    <Icon name="close" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          <View style={styles.switchContainer}>
            <Text style={[styles.label, {color: theme.text, marginTop: 0}]}>Required</Text>
            <Switch
              value={required}
              onValueChange={setRequired}
              trackColor={{false: theme.border, true: theme.primary}}
              thumbColor="#FFFFFF"
              ios_backgroundColor={theme.border}
            />
          </View>

          <View style={styles.formActions}>
            {editingIndex !== null && (
              <TouchableOpacity
                style={[styles.cancelButton, {borderColor: theme.border}]}
                onPress={resetForm}>
                <Text style={[styles.cancelButtonText, {color: theme.text}]}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.addButton, {backgroundColor: theme.primary}]}
              onPress={handleAddOrUpdateQuestion}>
              <Icon name={editingIndex !== null ? 'check' : 'add'} size={20} color="#fff" />
              <Text style={styles.addButtonText}>
                {editingIndex !== null ? 'Update' : 'Add'} Question
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Questions List */}
        <View style={[styles.section, {backgroundColor: theme.card}]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, {color: theme.text}]}>Questions</Text>
            <View style={[styles.badge, {backgroundColor: theme.primary + '20'}]}>
              <Text style={[styles.badgeText, {color: theme.primary}]}>{questions.length}</Text>
            </View>
          </View>

          {questions.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="quiz" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyText, {color: theme.textSecondary}]}>
                No questions added yet
              </Text>
            </View>
          ) : (
            questions.map((q, index) => (
              <View key={q.id} style={[styles.questionCard, {backgroundColor: theme.background}]}>
                <View style={styles.questionHeader}>
                  <View style={styles.questionNumber}>
                    <Text style={[styles.questionNumberText, {color: theme.primary}]}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={styles.questionContent}>
                    <Text style={[styles.questionText, {color: theme.text}]}>
                      {q.question}
                      {q.required && <Text style={styles.required}> *</Text>}
                    </Text>
                    <View style={styles.questionMeta}>
                      <View style={[styles.typeBadge, {backgroundColor: theme.primary + '20'}]}>
                        <Text style={[styles.typeText, {color: theme.primary}]}>{q.type}</Text>
                      </View>
                      {q.options && (
                        <Text style={[styles.optionsCount, {color: theme.textSecondary}]}>
                          {q.options.length} options
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.questionActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, {backgroundColor: theme.primary + '20'}]}
                      onPress={() => handleEdit(index)}>
                      <Icon name="edit" size={18} color={theme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, {backgroundColor: '#FF3B30' + '20'}]}
                      onPress={() => handleDelete(index)}>
                      <Icon name="delete" size={18} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, {backgroundColor: theme.card}]}>
        <TouchableOpacity
          style={[styles.saveButton, {backgroundColor: theme.primary}]}
          onPress={handleSave}>
          <Icon name="check" size={24} color="#fff" />
          <Text style={styles.saveButtonText}>Save Questionnaire</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  typeList: {
    marginVertical: 8,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    marginRight: 8,
    gap: 6,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  optionInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  optionInput: {
    flex: 1,
    marginTop: 0,
  },
  addOptionButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  optionChipText: {
    fontSize: 14,
    flex: 1,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  questionCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  questionHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  questionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'currentColor',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  questionContent: {
    flex: 1,
  },
  questionText: {
    fontSize: 15,
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  questionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  optionsCount: {
    fontSize: 12,
  },
  questionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});
