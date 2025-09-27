// pages/api/auth/delete-user.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '../../../lib/supabase';

// Client admin Supabase avec la clé de service
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DeleteUserRequest {
  userId: string;
  confirmDeletion?: boolean;
}

interface DeleteUserResponse {
  success: boolean;
  message: string;
}

interface ExtendedNextApiRequest extends NextApiRequest {
  body: DeleteUserRequest;
}

/**
 * Handler pour la suppression d'utilisateur
 * DELETE /api/auth/delete-user
 */
export default async function handler(
  req: ExtendedNextApiRequest,
  res: NextApiResponse<DeleteUserResponse | { error: string }>
) {
  // Vérifier la méthode HTTP
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ 
      error: 'Method not allowed. Use DELETE.' 
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

    const { userId, confirmDeletion } = req.body;

    // Authentification obligatoire
    let authenticatedUser = null;
    try {
      authenticatedUser = await getCurrentUser();
      
      // Vérifier que l'utilisateur authentifié correspond au userId
      if (!authenticatedUser || authenticatedUser.id !== userId) {
        return res.status(401).json({ 
          error: 'Unauthorized: Invalid user authentication' 
        });
      }
    } catch (authError) {
      console.error('Authentication error:', authError);
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }

    // Vérification de confirmation
    if (!confirmDeletion) {
      return res.status(400).json({
        error: 'Confirmation required. Set confirmDeletion to true.'
      });
    }

    // Log de la requête (pour debugging et analytics)
    console.log('User deletion request:', {
      userId: userId.substring(0, 8) + '...',
      userAgent: req.headers['user-agent']?.substring(0, 50),
      timestamp: new Date().toISOString()
    });

    // Suppression de l'utilisateur via l'API admin
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      userId
    );

    if (deleteError) {
      console.error('Supabase deletion error:', deleteError);
      return res.status(500).json({
        error: 'Failed to delete user from authentication system'
      });
    }

    // Log du succès
    const responseTime = Date.now() - startTime;
    console.log('User deletion success:', {
      userId: userId.substring(0, 8) + '...',
      responseTimeMs: responseTime,
      timestamp: new Date().toISOString()
    });

    // Headers de réponse
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Response-Time', {responseTime}ms);
    res.setHeader('Cache-Control', 'no-cache');

    // Réponse de succès
    return res.status(200).json({
      success: true,
      message: 'User account successfully deleted'
    });

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    // Log de l'erreur
    console.error('User deletion API error:', {
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
        error: 'Le service ne répond pas. Réessayez dans quelques instants.'
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

  const { userId, confirmDeletion } = body;

  if (!userId || typeof userId !== 'string') {
    return {
      isValid: false,
      error: 'Field "userId" is required and must be a string'
    };
  }

  // Validation format UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    return {
      isValid: false,
      error: 'Field "userId" must be a valid UUID'
    };
  }

  if (confirmDeletion !== true) {
    return {
      isValid: false,
      error: 'Field "confirmDeletion" must be true to proceed'
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
      sizeLimit: '1kb',
    },
    responseLimit: '2kb',
  },
};
