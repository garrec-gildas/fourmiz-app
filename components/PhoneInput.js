import React, { useState, useRef, useEffect } from 'react';
import { TextInput, View, Text, StyleSheet } from 'react-native';

const PhoneInput = ({ 
  value = '', 
  onChangeText,
  placeholder = "06 12 34 56 78",
  style = {},
  error = false,
  errorMessage = "",
  label = "Téléphone *",
  ...props 
}) => {
  const [formattedValue, setFormattedValue] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef(null);

  // Fonction pour formater le numéro français
  const formatPhoneNumber = (input) => {
    // Enlever tous les caractères non-numériques
    const numbers = input.replace(/\D/g, '');
    
    // Limiter à 10 chiffres maximum
    const truncated = numbers.substring(0, 10);
    
    // Appliquer le format français : XX XX XX XX XX
    let formatted = '';
    for (let i = 0; i < truncated.length; i++) {
      if (i > 0 && i % 2 === 0) {
        formatted += ' ';
      }
      formatted += truncated[i];
    }
    
    return formatted;
  };

  // Calculer la nouvelle position du curseur après formatage
  const getNewCursorPosition = (oldValue, newValue, oldPosition) => {
    const oldNumbers = oldValue.replace(/\D/g, '');
    const newNumbers = newValue.replace(/\D/g, '');
    
    // Si on a ajouté un chiffre
    if (newNumbers.length > oldNumbers.length) {
      // Compter les espaces avant la position actuelle
      const spacesBeforePosition = (newValue.substring(0, oldPosition).match(/ /g) || []).length;
      const spacesBeforeOldPosition = (oldValue.substring(0, oldPosition).match(/ /g) || []).length;
      return oldPosition + (spacesBeforePosition - spacesBeforeOldPosition) + 1;
    }
    
    // Si on a supprimé un chiffre
    if (newNumbers.length < oldNumbers.length) {
      return Math.max(0, oldPosition - 1);
    }
    
    return oldPosition;
  };

  // Valider le format français
  const isValidFrenchPhone = (phone) => {
    const numbers = phone.replace(/\D/g, '');
    // Numéros français : 10 chiffres commençant par 0
    return /^0[1-9]\d{8}$/.test(numbers);
  };

  // Gérer les changements de texte
  const handleTextChange = (text) => {
    const formatted = formatPhoneNumber(text);
    const rawNumbers = formatted.replace(/\D/g, '');
    
    // Calculer la nouvelle position du curseur
    const newCursorPosition = getNewCursorPosition(
      formattedValue, 
      formatted, 
      cursorPosition
    );
    
    setFormattedValue(formatted);
    setCursorPosition(newCursorPosition);
    
    // Appeler la fonction parent avec les chiffres bruts
    if (onChangeText) {
      onChangeText(rawNumbers);
    }
  };

  // Gérer les changements de position du curseur
  const handleSelectionChange = (event) => {
    setCursorPosition(event.nativeEvent.selection.start);
  };

  // Mise à jour du formatage quand la valeur externe change
  useEffect(() => {
    if (value !== undefined) {
      const formatted = formatPhoneNumber(value);
      setFormattedValue(formatted);
    }
  }, [value]);

  // Mettre à jour la position du curseur après le rendu
  useEffect(() => {
    if (inputRef.current && cursorPosition !== undefined) {
      // Délai minimal pour que le TextInput soit mis à jour
      setTimeout(() => {
        inputRef.current?.setNativeProps({
          selection: { start: cursorPosition, end: cursorPosition }
        });
      }, 10);
    }
  }, [cursorPosition, formattedValue]);

  const hasError = error || (formattedValue && !isValidFrenchPhone(formattedValue));
  const currentErrorMessage = errorMessage || 
    (formattedValue && !isValidFrenchPhone(formattedValue) 
      ? "Format de téléphone invalide (ex: 06 12 34 56 78)" 
      : "");

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          hasError && styles.inputError,
          style
        ]}
        value={formattedValue}
        onChangeText={handleTextChange}
        onSelectionChange={handleSelectionChange}
        placeholder={placeholder}
        keyboardType="phone-pad"
        maxLength={14} // 10 chiffres + 4 espaces
        {...props}
      />
      
      {hasError && currentErrorMessage && (
        <Text style={styles.errorText}>{currentErrorMessage}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#e74c3c',
    borderWidth: 2,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    marginTop: 5,
    marginLeft: 5,
  },
});

export default PhoneInput;

// =================== UTILISATION ===================

/*
// Dans votre composant parent :

import React, { useState } from 'react';
import { View } from 'react-native';
import PhoneInput from './PhoneInput';

const ProfileForm = () => {
  const [phone, setPhone] = useState('');

  return (
    <View>
      <PhoneInput
        value={phone}
        onChangeText={setPhone}
        placeholder="06 12 34 56 78"
        label="Téléphone *"
        error={false}
      />
    </View>
  );
};

// =================== INTÉGRATION AVEC VALIDATION ===================

// Si vous utilisez react-hook-form ou une autre librairie :

const ProfileFormWithValidation = () => {
  const [phone, setPhone] = useState('');
  
  const validatePhone = (phoneNumber) => {
    const numbers = phoneNumber.replace(/\D/g, '');
    return /^0[1-9]\d{8}$/.test(numbers);
  };

  const handleSubmit = () => {
    if (validatePhone(phone)) {
      console.log('Téléphone valide:', phone);
      // Envoyer phone (format: "0612345678") à votre API
    } else {
      console.log('Téléphone invalide');
    }
  };

  return (
    <View>
      <PhoneInput
        value={phone}
        onChangeText={setPhone}
        error={phone && !validatePhone(phone)}
        errorMessage="Le format du téléphone est invalide"
      />
    </View>
  );
};
*/