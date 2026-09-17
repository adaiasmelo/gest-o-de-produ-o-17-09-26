
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

export const isBiometricAvailable = async (): Promise<boolean> => {
  try {
    if (!window.PublicKeyCredential) return false;
    const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return isAvailable;
  } catch (e) {
    console.error("isBiometricAvailable error:", e);
    return !!window.PublicKeyCredential;
  }
};

export const registerBiometrics = async (user: SystemUser): Promise<string | null> => {
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
  } catch (error) {
    console.error("Biometric registration error:", error);
    throw error;
  }
};

export const authenticateBiometrics = async (biometricId: string): Promise<boolean> => {
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
  } catch (error) {
    console.error("Biometric authentication error:", error);
    throw error;
  }
};
