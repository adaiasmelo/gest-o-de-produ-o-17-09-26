
import { SystemUser } from '../types';

// Helper to convert Uint8Array to Base64
const bufferToBase64 = (buffer: ArrayBuffer): string => {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
};

// Helper to convert Base64 to Uint8Array
const base64ToBuffer = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer;
};

/**
 * Checks whether WebAuthn / publickey-credentials is supported and permitted
 * by the current document's Permissions Policy (notably inside cross-origin child frames/iframes).
 */
export const isBiometricFeatureAllowed = (): boolean => {
  try {
    if (typeof window === 'undefined') return false;
    if (!window.PublicKeyCredential) return false;

    const doc = document as any;
    if (doc?.permissionsPolicy && typeof doc.permissionsPolicy.allowsFeature === 'function') {
      if (!doc.permissionsPolicy.allowsFeature('publickey-credentials-get')) {
        return false;
      }
    } else if (doc?.featurePolicy && typeof doc.featurePolicy.allowsFeature === 'function') {
      if (!doc.featurePolicy.allowsFeature('publickey-credentials-get')) {
        return false;
      }
    }

    // Modern browsers forbid WebAuthn in cross-origin iframes without explicit permission delegation
    if (window.self !== window.top) {
      if (doc?.permissionsPolicy && typeof doc.permissionsPolicy.allowsFeature === 'function') {
        if (!doc.permissionsPolicy.allowsFeature('publickey-credentials-get')) {
          return false;
        }
      }
    }

    return true;
  } catch {
    return false;
  }
};

export const isBiometricAvailable = async (): Promise<boolean> => {
  try {
    if (!window.PublicKeyCredential) return false;
    if (!isBiometricFeatureAllowed()) return false;
    const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return isAvailable;
  } catch (e) {
    return false;
  }
};

export const registerBiometrics = async (user: SystemUser): Promise<string | null> => {
  if (!isBiometricFeatureAllowed()) {
    const error = new Error("A autenticação biométrica (WebAuthn) não é permitida neste documento (restrição de segurança do navegador em iframes). Abra o sistema em uma nova aba do navegador.");
    error.name = "SecurityError";
    throw error;
  }

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));

    const options: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: "Gestão e Controle de Produção",
        id: window.location.hostname || "localhost",
      },
      user: {
        id: userId,
        name: user.registration,
        displayName: user.name,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" }, // ES256
        { alg: -257, type: "public-key" } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
      },
      timeout: 60000, // Standard timeout of 60 seconds
      attestation: "none",
    };

    const credential = (await navigator.credentials.create({
      publicKey: options,
    })) as PublicKeyCredential;

    if (credential) {
      return bufferToBase64(credential.rawId);
    }
    return null;
  } catch (error: any) {
    const isPolicyOrCanceled =
      error?.name === 'NotAllowedError' ||
      error?.name === 'SecurityError' ||
      error?.message?.includes('publickey-credentials') ||
      error?.message?.includes('Permissions Policy');

    if (!isPolicyOrCanceled) {
      console.error("Biometric registration error:", error);
    } else {
      console.warn("Biometric registration unavailable in this environment:", error?.message || error);
    }
    throw error;
  }
};

export const authenticateBiometrics = async (biometricId: string): Promise<boolean> => {
  if (!isBiometricFeatureAllowed()) {
    const error = new Error("A autenticação biométrica (WebAuthn) não é permitida neste documento (restrição de segurança do navegador em iframes). Abra o sistema em uma nova aba do navegador.");
    error.name = "SecurityError";
    throw error;
  }

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const rawId = base64ToBuffer(biometricId);

    const options: PublicKeyCredentialRequestOptions = {
      challenge,
      allowCredentials: [
        {
          id: rawId,
          type: "public-key",
          transports: ["internal"],
        },
      ],
      userVerification: "required",
      timeout: 60000, // Standard timeout of 60 seconds
    };

    const assertion = await navigator.credentials.get({
      publicKey: options,
    });

    return !!assertion;
  } catch (error: any) {
    const isPolicyOrCanceled =
      error?.name === 'NotAllowedError' ||
      error?.name === 'SecurityError' ||
      error?.message?.includes('publickey-credentials') ||
      error?.message?.includes('Permissions Policy');

    if (!isPolicyOrCanceled) {
      console.error("Biometric authentication error:", error);
    } else {
      console.warn("Biometric authentication unavailable in this environment:", error?.message || error);
    }
    throw error;
  }
};
