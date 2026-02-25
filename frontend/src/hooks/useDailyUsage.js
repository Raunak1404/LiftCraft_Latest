import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { DAILY_LIMIT } from '../constants';

export const useDailyUsage = (currentUser) => {
  const [dailyUsage, setDailyUsage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (currentUser) {
      checkDailyUsage();
    }
  }, [currentUser]);

  const checkDailyUsage = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const usageDocRef = doc(db, 'daily_usage', currentUser.uid);
      const usageDoc = await getDoc(usageDocRef);

      const today = new Date().toDateString();

      if (usageDoc.exists()) {
        const data = usageDoc.data();
        const lastDate = data.lastResetDate;

        if (lastDate !== today) {
          await setDoc(usageDocRef, {
            count: 0,
            lastResetDate: today,
            updatedAt: serverTimestamp()
          });
          setDailyUsage(0);
        } else {
          setDailyUsage(data.count || 0);
        }
      } else {
        await setDoc(usageDocRef, {
          count: 0,
          lastResetDate: today,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setDailyUsage(0);
      }
    } catch (err) {
      console.error('Error checking daily usage:', err);
      setError('Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  const incrementUsage = async () => {
    if (!currentUser) return false;

    try {
      const usageDocRef = doc(db, 'daily_usage', currentUser.uid);
      const newCount = dailyUsage + 1;

      await updateDoc(usageDocRef, {
        count: newCount,
        updatedAt: serverTimestamp()
      });

      setDailyUsage(newCount);
      return true;
    } catch (err) {
      console.error('Error incrementing usage:', err);
      return false;
    }
  };

  const canGenerate = () => dailyUsage < DAILY_LIMIT;
  const getRemainingGenerations = () => Math.max(0, DAILY_LIMIT - dailyUsage);

  return {
    dailyUsage,
    loading,
    error,
    canGenerate,
    getRemainingGenerations,
    incrementUsage,
    refresh: checkDailyUsage
  };
};
