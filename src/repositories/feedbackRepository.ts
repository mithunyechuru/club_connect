import {
    collection,
    getDocs,
    addDoc,
    query,
    where,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { FeedbackForm, FeedbackResponse } from '../types';

/**
 * Repository for managing Feedback entities in Firestore
 */
export class FeedbackRepository {
    private readonly formCollection = 'feedbackForms';
    private readonly responseCollection = 'feedbackResponses';

    /**
     * Create a new feedback form for an event
     * @param form - The feedback form data (without formId)
     * @returns Promise<FeedbackForm> The created feedback form
     */
    async createFeedbackForm(form: Omit<FeedbackForm, 'formId'>): Promise<FeedbackForm> {
        try {
            const docRef = await addDoc(collection(db, this.formCollection), {
                ...form,
                createdAt: form.createdAt || Timestamp.now(),
            });

            return {
                formId: docRef.id,
                ...form,
            } as FeedbackForm;
        } catch (error) {
            console.error('Error creating feedback form:', error);
            throw new Error('Failed to create feedback form');
        }
    }

    /**
     * Get the feedback form for a specific event
     * @param eventId - The ID of the event
     * @returns Promise<FeedbackForm | null> The feedback form if found, null otherwise
     */
    async getFormByEvent(eventId: string): Promise<FeedbackForm | null> {
        try {
            const q = query(
                collection(db, this.formCollection),
                where('eventId', '==', eventId)
            );

            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                return null;
            }

            const formDoc = querySnapshot.docs[0];
            return {
                formId: formDoc.id,
                ...formDoc.data(),
            } as FeedbackForm;
        } catch (error) {
            console.error('Error getting feedback form by event:', error);
            throw new Error(`Failed to get feedback form for event ${eventId}`);
        }
    }

    /**
     * Submit a feedback response
     * @param response - The feedback response data (without responseId)
     * @returns Promise<FeedbackResponse> The created feedback response
     */
    async submitResponse(response: Omit<FeedbackResponse, 'responseId'>): Promise<FeedbackResponse> {
        try {
            const docRef = await addDoc(collection(db, this.responseCollection), {
                ...response,
                submittedAt: response.submittedAt || Timestamp.now(),
            });

            return {
                responseId: docRef.id,
                ...response,
            } as FeedbackResponse;
        } catch (error) {
            console.error('Error submitting feedback response:', error);
            throw new Error('Failed to submit feedback response');
        }
    }

    /**
     * Get all feedback responses for a specific form
     * @param formId - The ID of the feedback form
     * @returns Promise<FeedbackResponse[]> Array of responses for the form
     */
    async getResponsesByForm(formId: string): Promise<FeedbackResponse[]> {
        try {
            const q = query(
                collection(db, this.responseCollection),
                where('formId', '==', formId)
            );

            const querySnapshot = await getDocs(q);

            return querySnapshot.docs.map(doc => ({
                responseId: doc.id,
                ...doc.data(),
            } as FeedbackResponse));
        } catch (error) {
            console.error('Error getting feedback responses by form:', error);
            throw new Error(`Failed to get feedback responses for form ${formId}`);
        }
    }

    /**
     * Check if a student has already submitted feedback for a form
     * @param formId - The ID of the feedback form
     * @param studentId - The ID of the student
     * @returns Promise<boolean> True if the student has already submitted feedback, false otherwise
     */
    async hasStudentSubmitted(formId: string, studentId: string): Promise<boolean> {
        try {
            const q = query(
                collection(db, this.responseCollection),
                where('formId', '==', formId),
                where('studentId', '==', studentId)
            );

            const querySnapshot = await getDocs(q);

            return !querySnapshot.empty;
        } catch (error) {
            console.error('Error checking student feedback submission:', error);
            throw new Error(`Failed to check feedback submission for student ${studentId}`);
        }
    }
}

export const feedbackRepository = new FeedbackRepository();
