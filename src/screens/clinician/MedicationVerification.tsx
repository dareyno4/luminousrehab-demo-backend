import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, AlertTriangle, Camera, X } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Screen, NavigationParams } from '../../App';
import { supabaseClient } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';


interface Props {
  navigation: {
    navigate: (screen: Screen, params?: NavigationParams) => void;
    goBack: () => void;
  };
  route: {
    params: NavigationParams;
  };
}

interface FieldVerification {
  value: string;
  isVerified: boolean;
  confidence: number;
}

export default function MedicationVerification({ navigation, route }: Props) {
  const { patientId, chartId, medicationId, mode } = route.params || {};
  const isEditMode = mode === 'edit';
  const isCreateMode = !medicationId || mode === 'create';

  const { user } = useAuth();

    const [drugName, setDrugName] = useState<FieldVerification>({
    value: '',
    isVerified: false,
    confidence: 90,
  });

  const [strength, setStrength] = useState<FieldVerification>({
    value: '',
    isVerified: false,
    confidence: 85,
  });

  const [medicationRoute, setMedicationRoute] = useState<FieldVerification>({
    value: '',
    isVerified: false,
    confidence: 90,
  });

  const [frequency, setFrequency] = useState<FieldVerification>({
    value: '',
    isVerified: false,
    confidence: 80,
  });

  const [prescriber, setPrescriber] = useState<FieldVerification>({
    value: '',
    isVerified: false,
    confidence: 80,
  });

  const [scannedDate, setScannedDate] = useState<string>('');
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
    const loadMedication = async () => {
      if (!medicationId) {
        // new medication – nothing to load
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabaseClient
          .from('medications')
          .select('drug_name, strength, route, frequency, prescriber, scanned_on, ocr_confidence, verified, scanned_image')
          .eq('id', medicationId)
          .single();

        if (error) throw error;
        if (!data) return;

        const confidencePct = data.ocr_confidence != null
          ? Math.round(Number(data.ocr_confidence) * 100)
          : 90;

        setDrugName({
          value: data.drug_name ?? '',
          isVerified: !!data.verified,
          confidence: confidencePct,
        });
        setStrength({
          value: data.strength ?? '',
          isVerified: !!data.verified,
          confidence: confidencePct,
        });
        setMedicationRoute({
          value: data.route ?? '',
          isVerified: !!data.verified,
          confidence: confidencePct,
        });
        setFrequency({
          value: data.frequency ?? '',
          isVerified: !!data.verified,
          confidence: confidencePct,
        });
        setPrescriber({
          value: data.prescriber ?? '',
          isVerified: !!data.verified,
          confidence: confidencePct,
        });
        setScannedDate(
          data.scanned_on
            ? new Date(data.scanned_on).toLocaleString()
            : ''
        );
        setScannedImage(data.scanned_image || null);
        setLoadError(null);
      } catch (err: any) {
        console.error('Error loading medication', err);
        setLoadError(err.message || 'Failed to load medication');
      } finally {
        setLoading(false);
      }
    };

    loadMedication();
  }, [medicationId]);


  const allFieldsVerified = drugName.isVerified && strength.isVerified && medicationRoute.isVerified && frequency.isVerified && prescriber.isVerified;

  const handleVerifyField = (field: string) => {
    switch (field) {
      case 'drugName':
        setDrugName({ ...drugName, isVerified: true });
        break;
      case 'strength':
        setStrength({ ...strength, isVerified: true });
        break;
      case 'medicationRoute':
        setMedicationRoute({ ...medicationRoute, isVerified: true });
        break;
      case 'frequency':
        setFrequency({ ...frequency, isVerified: true });
        break;
      case 'prescriber':
        setPrescriber({ ...prescriber, isVerified: true });
        break;
    }
  };
  const handleExit = () => {
  navigation.navigate('ClinicianDashboard');
};


  const handleSave = async () => {
  if (!allFieldsVerified) {
    alert('Please verify all fields before saving');
    return;
  }

  try {
    setLoading(true);

    if (!chartId || !user?.tenant_id) {
      throw new Error('Missing chart or tenant information');
    }

    const basePayload = {
      chart_id: chartId,
      tenant_id: user.tenant_id,
      drug_name: drugName.value,
      strength: strength.value || null,
      route: medicationRoute.value || null,
      frequency: frequency.value || null,
      prescriber: prescriber.value || null,
      instructions: null,
      notes: null,
      scanned_on: scannedDate
        ? new Date(scannedDate).toISOString()
        : null,
      // store as 0–1 in DB
      ocr_confidence: 0.9,
      verified: true,
      changed_after_verify: false,
      scanned_image: scannedImage || null, // Preserve the scanned image
    };

    let finalMedicationId = medicationId;

    if (medicationId) {
      // EDIT: update existing row
      const { data, error } = await supabaseClient
        .from('medications')
        .update(basePayload)
        .eq('id', medicationId)
        .select('id')
        .single();

      if (error) throw error;
      finalMedicationId = data.id;
    } else {
      // CREATE: insert new row
      const { data, error } = await supabaseClient
        .from('medications')
        .insert([basePayload])
        .select('id')
        .single();

      if (error) throw error;
      finalMedicationId = data.id;
    }

    // After saving & marking as verified, go back to the chart detail flow
  navigation.navigate('ChartDetail', {
    patientId,
    chartId,
  } as NavigationParams);

  } catch (err: any) {
    console.error('Error saving medication', err);
    alert(err.message || 'Failed to save medication');
  } finally {
    setLoading(false);
  }
};


  const VerificationField = ({ 
    label, 
    field, 
    value, 
    isVerified, 
    confidence, 
    onChange, 
    onVerify 
  }: { 
    label: string; 
    field: string; 
    value: string; 
    isVerified: boolean; 
    confidence: number; 
    onChange: (val: string) => void; 
    onVerify: () => void; 
  }) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label htmlFor={field}>{label}</Label>
        <div className="flex items-center gap-2">
          <Badge
            className={
              confidence >= 90
                ? 'bg-[#D1FAE5] text-[#10B981] border-[#A7F3D0]'
                : confidence >= 75
                ? 'bg-[#FEF3C7] text-[#F59E0B] border-[#FDE68A]'
                : 'bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]'
            }
          >
            {confidence}% confidence
          </Badge>
          {isVerified && (
            <Badge className="bg-[#D1FAE5] text-[#10B981] border-[#A7F3D0]">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Verified
            </Badge>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Input
          id={field}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-12 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc]"
        />
        {!isVerified && (
          <Button
            onClick={onVerify}
            className="bg-[#0966CC] hover:bg-[#0C4A6E] text-white px-6"
          >
            Verify
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0966CC] to-[#0C4A6E] p-5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigation.goBack()}
            className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg text-white">{isEditMode ? 'Edit Medication' : 'Verify Medication'}</h1>
          <Button
            onClick={handleExit}
            variant="ghost"
            size="sm"
            className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Exit
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Verification Alert */}
          {!allFieldsVerified && (
            <div className="bg-[#FEF3C7] border-2 border-[#FDE68A] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-[#92400E] mb-1">Field Verification Required</h3>
                  <p className="text-sm text-[#92400E]">
                    Please review and verify each field. Click "Verify" on each field after confirming the information is correct.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Scanned Image Preview */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg text-[#0f172a]">Scanned Image</h2>
              <Badge className="bg-[#E0F2FE] text-[#0966CC] border-[#BFDBFE]">
                <Camera className="w-3 h-3 mr-1" />
                {scannedDate}
              </Badge>
            </div>
            {scannedImage ? (
              <div className="rounded-xl border-2 border-[#e2e8f0] overflow-hidden bg-[#f8fafc]">
                <img
                  src={scannedImage}
                  alt="Scanned medication"
                  className="w-full h-auto"
                />
              </div>
            ) : (
              <div className="aspect-video bg-[#f8fafc] rounded-xl border-2 border-dashed border-[#e2e8f0] flex items-center justify-center">
                <div className="text-center">
                  <Camera className="w-12 h-12 text-[#cbd5e1] mx-auto mb-2" />
                  <p className="text-sm text-[#64748b]">No scanned image available</p>
                </div>
              </div>
            )}
          </div>

          {/* Medication Fields */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
            <h2 className="text-lg text-[#0f172a] mb-4">Medication Information</h2>
            <div className="space-y-4">
              <VerificationField
                label="Drug Name"
                field="drugName"
                value={drugName.value}
                isVerified={drugName.isVerified}
                confidence={drugName.confidence}
                onChange={(val) => setDrugName({ ...drugName, value: val, isVerified: false })}
                onVerify={() => handleVerifyField('drugName')}
              />

              <VerificationField
                label="Strength"
                field="strength"
                value={strength.value}
                isVerified={strength.isVerified}
                confidence={strength.confidence}
                onChange={(val) => setStrength({ ...strength, value: val, isVerified: false })}
                onVerify={() => handleVerifyField('strength')}
              />

              <VerificationField
                label="Route"
                field="medicationRoute"
                value={medicationRoute.value}
                isVerified={medicationRoute.isVerified}
                confidence={medicationRoute.confidence}
                onChange={(val) => setMedicationRoute({ ...medicationRoute, value: val, isVerified: false })}
                onVerify={() => handleVerifyField('medicationRoute')}
              />

              <VerificationField
                label="Frequency"
                field="frequency"
                value={frequency.value}
                isVerified={frequency.isVerified}
                confidence={frequency.confidence}
                onChange={(val) => setFrequency({ ...frequency, value: val, isVerified: false })}
                onVerify={() => handleVerifyField('frequency')}
              />

              <VerificationField
                label="Prescriber"
                field="prescriber"
                value={prescriber.value}
                isVerified={prescriber.isVerified}
                confidence={prescriber.confidence}
                onChange={(val) => setPrescriber({ ...prescriber, value: val, isVerified: false })}
                onVerify={() => handleVerifyField('prescriber')}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => navigation.goBack()}
              variant="outline"
              className="flex-1 h-12 rounded-xl border-2 border-[#e2e8f0]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 h-12 rounded-xl bg-[#0966CC] hover:bg-[#0C4A6E] text-white"
              disabled={!allFieldsVerified}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Save {allFieldsVerified ? '' : '(Verify All Fields)'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
