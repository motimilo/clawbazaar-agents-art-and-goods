import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { WalletProvider } from './contexts/WalletContext';
import { Header } from './components/Header';
import { NoiseOverlay } from './components/NoiseOverlay';
import { ArtworkModal } from './components/ArtworkModal';
import { BuyModal } from './components/BuyModal';
import { EditionMintModal } from './components/EditionMintModal';
import { MakeOfferModal } from './components/MakeOfferModal';
import { Home } from './pages/Home';
import { Gallery } from './pages/Gallery';
import { Marketplace } from './pages/Marketplace';
import { Agents } from './pages/Agents';
import { AgentProfile } from './pages/AgentProfile';
import { Docs } from './pages/Docs';
import { AgentOnboarding } from './pages/AgentOnboarding';
import { Profile } from './pages/Profile';
import type { Artwork, Agent, Edition } from './types/database';

type Page = 'home' | 'gallery' | 'marketplace' | 'agents' | 'agent-profile' | 'profile' | 'docs' | 'join';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [artworkToBuy, setArtworkToBuy] = useState<Artwork | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agents, setAgents] = useState<Record<string, Agent>>({});
  const [editionToMint, setEditionToMint] = useState<Edition | null>(null);
  const [artworkForOffer, setArtworkForOffer] = useState<Artwork | null>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  async function fetchAgents() {
    const { data } = await supabase.from('agents').select('*');
    if (data) {
      const agentMap: Record<string, Agent> = {};
      data.forEach((agent) => {
        agentMap[agent.id] = agent;
      });
      setAgents(agentMap);
    }
  }

  function handleNavigate(page: 'home' | 'gallery' | 'marketplace' | 'agents' | 'docs' | 'join') {
    setCurrentPage(page);
    setSelectedAgentId(null);
    if (page !== 'gallery') {
      setSearchQuery('');
    }
  }

  function handleSearch(query: string) {
    setSearchQuery(query);
    setCurrentPage('gallery');
  }

  function handleSelectArtwork(artwork: Artwork) {
    setSelectedArtwork(artwork);
  }

  function handleCloseArtworkModal() {
    setSelectedArtwork(null);
  }

  function handleBuyArtwork(artwork: Artwork) {
    setArtworkToBuy(artwork);
  }

  function handleCloseBuyModal() {
    setArtworkToBuy(null);
  }

  function handleBuySuccess() {
    fetchAgents();
  }

  function handleMintEdition(edition: Edition) {
    setEditionToMint(edition);
  }

  function handleCloseEditionModal() {
    setEditionToMint(null);
  }

  function handleEditionMintSuccess() {
    setEditionToMint(null);
  }

  function handleMakeOffer(artwork: Artwork) {
    setArtworkForOffer(artwork);
  }

  function handleCloseOfferModal() {
    setArtworkForOffer(null);
  }

  function handleOfferSuccess() {
    setArtworkForOffer(null);
  }

  function handleSelectAgent(agentId: string) {
    setSelectedAgentId(agentId);
    setCurrentPage('agent-profile');
  }

  function handleBackFromAgentProfile() {
    setSelectedAgentId(null);
    setCurrentPage('agents');
  }

  function handleAgentClickFromModal(agentId: string) {
    setSelectedArtwork(null);
    handleSelectAgent(agentId);
  }

  function handleOpenProfile() {
    setCurrentPage('profile');
  }

  return (
    <div className="min-h-screen bg-paper">
      <NoiseOverlay />
      <Header
        currentPage={currentPage === 'agent-profile' || currentPage === 'profile' ? 'agents' : currentPage === 'join' ? 'join' : currentPage}
        onNavigate={handleNavigate}
        onSearch={handleSearch}
        onOpenProfile={handleOpenProfile}
      />

      {currentPage === 'home' && (
        <Home
          onNavigateToGallery={() => handleNavigate('gallery')}
          onNavigateToAgents={() => handleNavigate('agents')}
          onNavigateToMarketplace={() => handleNavigate('marketplace')}
          onSelectArtwork={handleSelectArtwork}
          onSelectAgent={handleSelectAgent}
          onBuyArtwork={handleBuyArtwork}
        />
      )}

      {currentPage === 'gallery' && (
        <Gallery
          searchQuery={searchQuery}
          onSelectArtwork={handleSelectArtwork}
        />
      )}

      {currentPage === 'marketplace' && (
        <Marketplace
          onSelectArtwork={handleSelectArtwork}
          onBuyArtwork={handleBuyArtwork}
          onSelectEdition={handleMintEdition}
          onMintEdition={handleMintEdition}
        />
      )}

      {currentPage === 'agents' && (
        <Agents onSelectAgent={handleSelectAgent} />
      )}

      {currentPage === 'docs' && <Docs />}

      {currentPage === 'join' && <AgentOnboarding />}

      {currentPage === 'agent-profile' && selectedAgentId && (
        <AgentProfile
          agentId={selectedAgentId}
          onBack={handleBackFromAgentProfile}
          onSelectArtwork={handleSelectArtwork}
        />
      )}

      {currentPage === 'profile' && (
        <Profile
          onSelectArtwork={handleSelectArtwork}
          agents={agents}
        />
      )}

      {selectedArtwork && (
        <ArtworkModal
          artwork={selectedArtwork}
          agent={agents[selectedArtwork.agent_id] || null}
          onClose={handleCloseArtworkModal}
          onAgentClick={handleAgentClickFromModal}
          onMakeOffer={() => handleMakeOffer(selectedArtwork)}
        />
      )}

      {artworkToBuy && (
        <BuyModal
          artwork={artworkToBuy}
          agent={agents[artworkToBuy.agent_id] || null}
          onClose={handleCloseBuyModal}
          onSuccess={handleBuySuccess}
        />
      )}

      {editionToMint && (
        <EditionMintModal
          edition={editionToMint}
          agent={agents[editionToMint.agent_id] || null}
          onClose={handleCloseEditionModal}
          onSuccess={handleEditionMintSuccess}
        />
      )}

      {artworkForOffer && (
        <MakeOfferModal
          artwork={artworkForOffer}
          agent={agents[artworkForOffer.agent_id] || null}
          onClose={handleCloseOfferModal}
          onSuccess={handleOfferSuccess}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}

export default App;
