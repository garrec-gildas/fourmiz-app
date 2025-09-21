// pages/api/address/validate.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { GeocodingService } from '../../../../lib/services/geocodingService';
import { getCurrentUser } from '../../../../lib/supabase';
import type { 
  AddressValidationRequest, 
  AddressValidationResponse 
} from '../../../types/address';

interface ExtendedNextApiRequest extends NextApiRequest {
  body: AddressValidationRequest;
}

/**
 * Handler pour la validation d'adresse
 * POST /api/address/validate
 */
export default async function handler(
  req: ExtendedNextApiRequest,
  res: NextApiResponse<AddressValidationResponse | { error: string }>
) {
  // Vérifier la méthode HTTP
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      error: 'Method not allowed. Use POST.' 
    });
  }

  const startTime = Date.now();

  try {
    // Validation des données d'entrée
    const validationResult = validateRequestBody(req.body);
    if (!validationResult.isValid) {
      return res.status(400).json({ 
        error: validationResult.error 
      });
    }

    const { address, postalCode, city, userId, source } = req.body;

    // Authentification optionnelle (si userId fourni)
    let authenticatedUser = null;
    if (userId) {
      try {
        authenticatedUser = await getCurrentUser();
        
        // Vérifier que l'utilisateur authentifié correspond au userId
        if (!authenticatedUser || authenticatedUser.id !== userId) {
          return res.status(401).json({ 
            error: 'Unauthorized: Invalid user authentication' 
          });
        }
      } catch (authError) {
        console.warn('Authentication warning:', authError);
        // Continuer sans authentification pour la validation publique
      }
    }

    // Log de la requête (pour debugging et analytics)
    console.log('Address validation request:', {
      address: address.substring(0, 20) + '...',
      postalCode,
      city,
      userId: userId ? 'provided' : 'anonymous',
      source: source || 'unknown',
      userAgent: req.headers['user-agent']?.substring(0, 50),
      timestamp: new Date().toISOString()
    });

    // Appel au service de géocodage
    const result = await GeocodingService.validateAddress({
      address,
      postalCode,
      city,
      userId,
      source
    });

    // Log du résultat
    const responseTime = Date.now() - startTime;
    console.log('Address validation result:', {
      success: result.success,
      confidence: result.confidence,
      responseTimeMs: responseTime,
      hasCoordinates: !!result.coordinates,
      userId: userId ? 'provided' : 'anonymous'
    });

    // Headers de réponse
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    
    // Cache headers pour les succès (optionnel)
    if (result.success && result.confidence && result.confidence > 0.9) {
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 heure
    } else {
      res.setHeader('Cache-Control', 'no-cache');
    }

    // Réponse de succès
    if (result.success) {
      return res.status(200).json(result);
    } else {
      // Réponse d'échec (non trouvé, mais pas d'erreur serveur)
      return res.status(200).json(result);
    }

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    // Log de l'erreur
    console.error('Address validation API error:', {
      error: error.message,
      stack: error.stack?.substring(0, 200),
      responseTimeMs: responseTime,
      body: req.body,
      userAgent: req.headers['user-agent']?.substring(0, 50)
    });

    // Classification des erreurs pour la réponse
    if (error.message?.includes('RATE_LIMITED')) {
      return res.status(429).json({
        error: 'Trop de requêtes. Veuillez patienter avant de réessayer.'
      });
    }

    if (error.message?.includes('TIMEOUT')) {
      return res.status(504).json({
        error: 'Le service d\'adresse ne répond pas. Réessayez dans quelques instants.'
      });
    }

    if (error.message?.includes('NETWORK_ERROR')) {
      return res.status(503).json({
        error: 'Service temporairement indisponible. Réessayez plus tard.'
      });
    }

    // Erreur générique
    return res.status(500).json({
      error: 'Erreur interne du serveur. Contactez le support si le problème persiste.'
    });
  }
}

/**
 * Valide le body de la requête
 */
function validateRequestBody(body: any): {
  isValid: boolean;
  error?: string;
} {
  if (!body) {
    return {
      isValid: false,
      error: 'Request body is required'
    };
  }

  const { address, postalCode, city } = body;

  if (!address || typeof address !== 'string') {
    return {
      isValid: false,
      error: 'Field "address" is required and must be a string'
    };
  }

  if (!postalCode || typeof postalCode !== 'string') {
    return {
      isValid: false,
      error: 'Field "postalCode" is required and must be a string'
    };
  }

  if (!city || typeof city !== 'string') {
    return {
      isValid: false,
      error: 'Field "city" is required and must be a string'
    };
  }

  // Validation format
  if (address.trim().length < 5) {
    return {
      isValid: false,
      error: 'Address must be at least 5 characters long'
    };
  }

  if (!/^\d{5}$/.test(postalCode.trim())) {
    return {
      isValid: false,
      error: 'Postal code must be exactly 5 digits'
    };
  }

  if (city.trim().length < 2) {
    return {
      isValid: false,
      error: 'City name must be at least 2 characters long'
    };
  }

  // Validation optionnelle userId
  if (body.userId && typeof body.userId !== 'string') {
    return {
      isValid: false,
      error: 'Field "userId" must be a string if provided'
    };
  }

  // Validation optionnelle source
  if (body.source && !['profile', 'service', 'booking'].includes(body.source)) {
    return {
      isValid: false,
      error: 'Field "source" must be one of: profile, service, booking'
    };
  }

  return { isValid: true };
}

/**
 * Configuration de l'API Next.js
 */
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1kb', // Limite la taille du body
    },
    responseLimit: '8kb', // Limite la taille de la réponse
  },
};