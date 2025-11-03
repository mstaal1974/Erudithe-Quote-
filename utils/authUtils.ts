// Dummy authentication utility functions for prototype

export const hashPassword = (password: string): string => {
    // In a real app, use a strong hashing algorithm like bcrypt
    return btoa(password);
}

export const verifyPassword = (password: string, hash: string): boolean => {
    // In a real app, use the corresponding bcrypt.compare function
    try {
        return atob(hash) === password;
    } catch (e) {
        return false;
    }
}

export const generate2FACode = (): string => {
    // Generates a random 6-digit code
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export const generatePasswordResetToken = (): string => {
    return 'reset-token-' + Math.random().toString(36).substring(2, 15);
}