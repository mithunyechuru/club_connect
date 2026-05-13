import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { userRepository } from '../repositories/userRepository';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
    isOfficer: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setLoading(true);
            if (firebaseUser) {
                try {
                    // 1. Check dedicated admins collection FIRST
                    const adminDoc = await userRepository.getUserFromAdminsCollection(firebaseUser.uid);

                    if (adminDoc) {
                        // Map admin doc to User structure
                        const userData: User = {
                            userId: adminDoc.userId || firebaseUser.uid,
                            email: adminDoc.email || firebaseUser.email || '',
                            passwordHash: 'FIREBASE_AUTH',
                            role: UserRole.ADMINISTRATOR,
                            profile: {
                                firstName: adminDoc.name || 'Admin',
                                lastName: 'User',
                                email: adminDoc.email || firebaseUser.email || ''
                            },
                            createdAt: Timestamp.now(),
                            lastLogin: Timestamp.now(),
                            preferences: {
                                emailNotifications: true,
                                pushNotifications: true,
                                eventReminders: true,
                                clubAnnouncements: true
                            },
                            totalPoints: 0,
                            eventsAttendedCount: 0,
                            badgesEarnedCount: 0
                        };
                        setUser(userData);
                    } else {
                        // 2. If not an admin, check regular users collection
                        const userData = await userRepository.getUserById(firebaseUser.uid);
                        // Double check if role is 'Admin' in users collection too
                        if (userData && (userData.role as any) === 'Admin') {
                            userData.role = UserRole.ADMINISTRATOR;
                        }
                        setUser(userData);
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const signOut = async () => {
        await auth.signOut();
        setUser(null);
    };

    // Use string literals or enum for robust checking
    const isAdmin = user?.role === UserRole.ADMINISTRATOR || (user?.role as any) === 'ADMINISTRATOR' || (user?.role as any) === 'Admin';
    const isOfficer = user?.role === UserRole.CLUB_OFFICER || (user?.role as any) === 'CLUB_OFFICER' || isAdmin;

    return (
        <AuthContext.Provider value={{ user, loading, isAdmin, isOfficer, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
