/// Keep labels in sync with admin-web / backend level ids.
const Map<String, String> kLevelLabels = {
  'grade_7': 'Grade 7',
  'grade_8': 'Grade 8',
  'grade_9': 'Grade 9',
  'grade_10': 'Grade 10',
  'grade_11': 'Grade 11',
  'grade_12': 'Grade 12',
  'college_1': 'College — 1st Year',
  'college_2': 'College — 2nd Year',
  'college_3': 'College — 3rd Year',
  'college_4': 'College — 4th Year',
  'college_5': 'College — 5th Year',
  'junior_high': 'Junior High',
  'college': 'College',
};

String labelForLevel(String? id) {
  if (id == null || id.isEmpty) return 'Not set';
  return kLevelLabels[id] ?? id;
}
