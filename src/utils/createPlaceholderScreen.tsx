import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Screen, NavigationParams } from '../App';

export function createPlaceholderScreen(screenTitle: string, gradientFrom: string = '#0966CC', gradientTo: string = '#0C4A6E') {
  return function PlaceholderScreen({ navigation }: { 
    navigation: {
      navigate: (screen: Screen, params?: NavigationParams) => void;
      goBack: () => void;
    };
  }) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div
          className="p-5 flex items-center justify-between"
          style={{
            background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
          }}
        >
          <button
            onClick={() => navigation.goBack()}
            className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="flex-1 text-center text-lg text-white">{screenTitle}</h1>
          <div className="w-10" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-2xl text-[#0f172a] mb-2">{screenTitle}</h2>
          <p className="text-[#64748b]">This screen is under development</p>
        </div>
      </div>
    );
  };
}
