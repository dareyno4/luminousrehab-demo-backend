import React, { useState } from 'react';
import { X, Search, Plus, User, Calendar, MapPin, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import type { MedicationInfo } from '../utils/ocrService';

export interface PatientBasic {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  address?: string;
}

interface Props {
  scannedMedications: Partial<MedicationInfo>[];
  scanType: string;
  patients?: PatientBasic[];
  onSelectExistingPatient: (patientId: string) => void;
  onCreateNewPatient: () => void;
  onCancel: () => void;
}

export default function PatientSelectionModal({
  scannedMedications,
  scanType,
  patients,
  onSelectExistingPatient,
  onCreateNewPatient,
  onCancel
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');

  const fallbackPatients: PatientBasic[] = [
    { id: '1', firstName: 'Sarah', lastName: 'Johnson', dateOfBirth: '1985-06-15', address: '456 Oak Ave, Springfield, IL 62704' },
    { id: '2', firstName: 'Michael', lastName: 'Chen', dateOfBirth: '1972-11-03', address: '789 Pine St, Springfield, IL 62701' },
    { id: '3', firstName: 'Emma', lastName: 'Williams', dateOfBirth: '1990-03-22', address: '321 Elm Rd, Springfield, IL 62702' },
  ];

  const list = patients && patients.length > 0 ? patients : fallbackPatients;

  const filteredPatients = searchQuery
    ? list.filter(
        (p) =>
          p.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.lastName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : list;

  const calculateAge = (dateString?: string) => {
    if (!dateString) return '-';
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Add Medication To Patient</h2>
            <button
              onClick={onCancel}
              className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Scanned Medications Info */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-sm text-emerald-800">
              <strong>{scannedMedications.length} medication{scannedMedications.length > 1 ? 's' : ''}</strong> scanned via {scanType}
            </p>
            <div className="mt-2 space-y-1">
              {scannedMedications.map((med, idx) => (
                <div key={idx} className="text-sm text-emerald-700">
                  • {med.name || 'Unknown medication'} {med.dosage ? `(${med.dosage})` : ''}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Create New Patient Option */}
          <Card
            className="p-5 cursor-pointer hover:shadow-lg hover:border-[#0966CC] transition-all group"
            onClick={onCreateNewPatient}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#E0F2FE] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6 text-[#0966CC]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 mb-1">Create New Patient Chart</h3>
                <p className="text-sm text-slate-600">
                  Start a new patient chart with these scanned medications
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#0966CC] transition-colors" />
            </div>
          </Card>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-sm text-slate-500 font-medium">OR</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Add to Existing Patient */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
              Add to Existing Patient
            </h3>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search patients by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Patient List */}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filteredPatients.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <User className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No patients found</p>
                </div>
              ) : (
                filteredPatients.map((patient) => (
                  <Card
                    key={patient.id}
                    className="p-4 cursor-pointer hover:shadow-md hover:border-[#0966CC] transition-all"
                    onClick={() => onSelectExistingPatient(patient.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 truncate">
                          {patient.firstName} {patient.lastName}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Age {calculateAge(patient.dateOfBirth)}
                          </span>
                          {patient.address && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{patient.address}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200">
          <Button onClick={onCancel} variant="outline" className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}