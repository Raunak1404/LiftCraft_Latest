import { useState } from 'react';
import { collection, addDoc, query, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export const useDesigns = (currentUser) => {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const saveDesign = async (designData) => {
    if (!currentUser) throw new Error('User not authenticated');

    try {
      const designRef = await addDoc(collection(db, 'airfoil_designs'), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        createdAt: new Date(),
        inputs: {
          CL_target: parseFloat(designData.inputs.CL_target),
          alpha: parseFloat(designData.inputs.alpha),
          Re: parseFloat(designData.inputs.Re),
          airfoil_type: designData.inputs.airfoil_type,
          optimization_mode: designData.inputs.optimization_mode
        },
        results: designData.results,
        pdfBase64: designData.pdfBase64
      });
      return designRef.id;
    } catch (err) {
      console.error('Error saving design:', err);
      throw err;
    }
  };

  const loadDesigns = async () => {
    if (!currentUser) return;

    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, 'airfoil_designs'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const loadedDesigns = [];

      querySnapshot.forEach((doc) => {
        loadedDesigns.push({
          id: doc.id,
          ...doc.data()
        });
      });

      setDesigns(loadedDesigns);
    } catch (err) {
      console.error('Error loading designs:', err);
      setError('Failed to load past designs: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteDesign = async (designId) => {
    try {
      await deleteDoc(doc(db, 'airfoil_designs', designId));
      setDesigns(designs.filter(d => d.id !== designId));
    } catch (err) {
      console.error('Error deleting design:', err);
      throw err;
    }
  };

  return {
    designs,
    loading,
    error,
    saveDesign,
    loadDesigns,
    deleteDesign
  };
};
