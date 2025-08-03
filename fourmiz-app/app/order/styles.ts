import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 16 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backText: { marginLeft: 8, color: '#FF4444' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  serviceBlock: { marginBottom: 16 },
  serviceTitle: { fontSize: 18, fontWeight: 'bold' },
  serviceDescription: { fontSize: 14, color: '#777' },
  label: { fontSize: 16, marginBottom: 8 },
  input: { borderWidth: 1, padding: 8, marginBottom: 16, borderRadius: 4 },
  textArea: { borderWidth: 1, padding: 8, height: 100, marginBottom: 16, borderRadius: 4 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  error: { color: 'red', marginBottom: 16 },
  button: { padding: 16, backgroundColor: '#2196F3', alignItems: 'center', borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', padding: 16, margin: 16, borderRadius: 8 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  modalButton: { padding: 8 },
});
