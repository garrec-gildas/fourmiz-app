// src/components/AddressInputWithAutocomplete.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Keyboard,
  LayoutAnimation,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAddressValidation } from '../../hooks/useAddressValidation';
import type { AddressSuggestion } from '../types/address';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onAddressSelected: (address: AddressSuggestion) => void;
  postalCode?: string;
  city?: string;
  placeholder?: string;
  style?: any;
  errors?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  testID?: string;
}

export const AddressInputWithAutocomplete: React.FC<Props> = ({
  value,
  onChangeText,
  onAddressSelected,
  postalCode,
  city,
  placeholder = "123 rue de la Paix",
  style,
  errors,
  disabled = false,
  autoFocus = false,
  testID = 'address-input'
}) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [validationStatus, setValidationStatus] = useState<{
    isValid?: boolean;
    message?: string;
    confidence?: number;
  }>({});
  const [isFocused, setIsFocused] = useState(false);
  
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  
  const { validateAddress, isLoading, error } = useAddressValidation({
    minLength: 3,
    maxSuggestions: 5
  });

  // Debounced validation
  const debouncedValidation = useCallback(
    (address: string, postal?: string, cityName?: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      debounceRef.current = setTimeout(async () => {
        if (address.length >= 3) {
          try {
            const result = await validateAddress(address, postal, cityName);
            
            setSuggestions(result.suggestions);
            setShowSuggestions(result.suggestions.length > 0 && isFocused);
            
            if (result.isValid) {
              setValidationStatus({
                isValid: true,
                message: `Adresse trouvée`,
                confidence: result.confidence
              });
            } else if (result.suggestions.length > 0) {
              setValidationStatus({
                isValid: false,
                message: 'Sélectionnez une suggestion ou précisez l\'adresse'
              });
            } else {
              setValidationStatus({
                isValid: false,
                message: result.error || 'Adresse non trouvée'
              });
            }
          } catch (err) {
            console.warn('Validation error:', err);
            setValidationStatus({
              isValid: false,
              message: 'Erreur lors de la validation'
            });
          }
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
          setValidationStatus({});
        }
      }, 300);
    },
    [validateAddress, isFocused]
  );

  // Effect pour déclencher la validation
  useEffect(() => {
    debouncedValidation(value, postalCode, city);
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, postalCode, city, debouncedValidation]);

  const handleSuggestionPress = useCallback((suggestion: AddressSuggestion) => {
    if (Platform.OS === 'ios') {
      LayoutAnimation.easeInEaseOut();
    }
    
    onChangeText(suggestion.label);
    onAddressSelected(suggestion);
    setShowSuggestions(false);
    setValidationStatus({
      isValid: true,
      message: `Adresse sélectionnée`,
      confidence: suggestion.score
    });
    
    // Cacher le clavier sur mobile
    if (inputRef.current) {
      inputRef.current.blur();
    }
    Keyboard.dismiss();
  }, [onChangeText, onAddressSelected]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  }, [suggestions.length]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Délai pour permettre la sélection d'une suggestion
    setTimeout(() => {
      setShowSuggestions(false);
    }, 150);
  }, []);

  const handleChangeText = useCallback((text: string) => {
    onChangeText(text);
    
    // Reset validation status when typing
    if (validationStatus.isValid) {
      setValidationStatus({});
    }
  }, [onChangeText, validationStatus.isValid]);

  const renderSuggestionItem = useCallback(({ item, index }: { 
    item: AddressSuggestion; 
    index: number;
  }) => (
    <TouchableOpacity
      style={[
        styles.suggestionItem,
        index === suggestions.length - 1 && styles.suggestionItemLast
      ]}
      onPress={() => handleSuggestionPress(item)}
      activeOpacity={0.7}
      testID={`${testID}-suggestion-${index}`}
    >
      <View style={styles.suggestionContent}>
        <View style={styles.suggestionIcon}>
          <Ionicons 
            name="location-outline" 
            size={16} 
            color="#666666" 
          />
        </View>
        <View style={styles.suggestionText}>
          <Text style={styles.suggestionLabel} numberOfLines={1}>
            {item.label}
          </Text>
          <View style={styles.suggestionMeta}>
            <Text style={styles.suggestionContext} numberOfLines={1}>
              {item.context}
            </Text>
            <View style={styles.suggestionScore}>
              <Text style={styles.suggestionScoreText}>
                {Math.round(item.score * 100)}%
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  ), [suggestions.length, handleSuggestionPress, testID]);

  const getInputBorderColor = () => {
    if (errors) return '#dc3545';
    if (validationStatus.isValid === true) return '#28a745';
    if (validationStatus.isValid === false) return '#ffc107';
    if (isFocused) return '#000000';
    return '#e0e0e0';
  };

  const getStatusColor = () => {
    if (errors) return '#dc3545';
    if (validationStatus.isValid === true) return '#28a745';
    if (validationStatus.isValid === false) return '#dc3545';
    return '#666666';
  };

  const getStatusIcon = () => {
    if (isLoading) return null;
    if (errors) return '❌';
    if (validationStatus.isValid === true) return '✅';
    if (validationStatus.isValid === false) return '⚠️';
    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            { borderColor: getInputBorderColor() },
            disabled && styles.inputDisabled,
            style
          ]}
          value={value}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor="#999999"
          editable={!disabled}
          autoFocus={autoFocus}
          autoCorrect={false}
          autoComplete="street-address"
          textContentType="streetAddressLine1"
          maxLength={200}
          testID={testID}
        />
        
        {isLoading && (
          <View style={styles.inputIndicator}>
            <ActivityIndicator size="small" color="#666666" />
          </View>
        )}
      </View>

      {/* Status message */}
      {(isLoading || validationStatus.message || errors) && (
        <View style={styles.statusContainer}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusIcon()} {isLoading ? 'Recherche d\'adresses...' : 
                               errors || 
                               validationStatus.message}
          </Text>
          {validationStatus.confidence && (
            <Text style={styles.confidenceText}>
              Confiance: {Math.round(validationStatus.confidence * 100)}%
            </Text>
          )}
        </View>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            renderItem={renderSuggestionItem}
            keyExtractor={(item, index) => `${item.label}-${index}`}
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            testID={`${testID}-suggestions`}
          />
        </View>
      )}

      {/* Network error indicator */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={16} color="#dc3545" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1,
  },
  
  inputContainer: {
    position: 'relative',
  },
  
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    fontSize: 16,
    color: '#000000',
    fontWeight: '400',
    paddingRight: 40, // Space for loading indicator
  },
  
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#999999',
  },
  
  inputIndicator: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  
  statusContainer: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  statusText: {
    fontSize: 12,
    fontWeight: '400',
    flex: 1,
  },
  
  confidenceText: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '500',
    marginLeft: 8,
  },
  
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  
  errorText: {
    fontSize: 12,
    color: '#dc3545',
    flex: 1,
  },
  
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    marginTop: 4,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    maxHeight: 250,
    zIndex: 1000,
  },
  
  suggestionsList: {
    flex: 1,
  },
  
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  suggestionIcon: {
    marginRight: 12,
    width: 20,
    alignItems: 'center',
  },
  
  suggestionText: {
    flex: 1,
  },
  
  suggestionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  
  suggestionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  suggestionContext: {
    fontSize: 12,
    color: '#666666',
    flex: 1,
  },
  
  suggestionScore: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginLeft: 8,
  },
  
  suggestionScoreText: {
    fontSize: 10,
    color: '#666666',
    fontWeight: '500',
  },
});