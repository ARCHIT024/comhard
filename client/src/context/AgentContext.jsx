import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client.js';

const AgentContext = createContext({
  currentAgent: null,
  setCurrentAgent: () => {},
  agents: [],
  loadingAgents: true
});

export function AgentProvider({ children }) {
  const [agents, setAgents] = useState([]);
  const [currentAgent, setCurrentAgent] = useState(() => {
    try {
      const saved = localStorage.getItem('support_desk_current_agent');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loadingAgents, setLoadingAgents] = useState(true);

  useEffect(() => {
    api.get('/api/agents')
      .then((res) => {
        if (res && res.data && res.data.length > 0) {
          setAgents(res.data);
          // If no currentAgent or current agent is not in list, default to first agent
          setCurrentAgent((prev) => {
            if (prev && res.data.some((a) => a.id === prev.id)) {
              return prev;
            }
            const defaultAgent = res.data[0];
            localStorage.setItem('support_desk_current_agent', JSON.stringify(defaultAgent));
            return defaultAgent;
          });
        }
      })
      .catch((err) => {
        console.error('Failed to load agents in context:', err);
      })
      .finally(() => {
        setLoadingAgents(false);
      });
  }, []);

  const handleSetCurrentAgent = (agent) => {
    setCurrentAgent(agent);
    try {
      localStorage.setItem('support_desk_current_agent', JSON.stringify(agent));
    } catch (e) {
      console.warn('Could not persist agent to localStorage', e);
    }
  };

  return (
    <AgentContext.Provider
      value={{
        currentAgent,
        setCurrentAgent: handleSetCurrentAgent,
        agents,
        loadingAgents
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  return useContext(AgentContext);
}

export default AgentContext;
