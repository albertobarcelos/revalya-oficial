/**
 * Componente de login seguro com monitoramento
 * Sistema Revalya - Exemplo de implementação de autenticação segura
 */

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { useSecureAuth, useSecurityMonitoring } from '../../hooks/useSecureAuth';
import { validatePasswordStrength, isValidEmail, PasswordStrength } from '../../types/auth';

/**
 * Interface para props do componente
 */
interface SecureLoginFormProps {
  onLoginSuccess?: () => void;
  onLoginError?: (error: string) => void;
  className?: string;
}

/**
 * Componente de indicador de força da senha
 */
const PasswordStrengthIndicator: React.FC<{ password: string }> = ({ password }) => {
  const [strength, setStrength] = useState<PasswordStrength | null>(null);
  
  useEffect(() => {
    if (password) {
      setStrength(validatePasswordStrength(password));
    } else {
      setStrength(null);
    }
  }, [password]);
  
  if (!strength) return null;
  
  const getColorClass = (level: PasswordStrength['level']) => {
    switch (level) {
      case 'weak': return 'bg-red-500';
      case 'fair': return 'bg-yellow-500';
      case 'good': return 'bg-blue-500';
      case 'strong': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };
  
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getColorClass(strength.level)}`}
            style={{ width: `${strength.score}%` }}
          />
        </div>
        <span className="text-xs font-medium capitalize">
          {strength.level === 'weak' && 'Fraca'}
          {strength.level === 'fair' && 'Razoável'}
          {strength.level === 'good' && 'Boa'}
          {strength.level === 'strong' && 'Forte'}
        </span>
      </div>
      {strength.feedback.length > 0 && (
        <ul className="text-xs text-gray-600 mt-1">
          {strength.feedback.map((feedback, index) => (
            <li key={index} className="flex items-center gap-1">
              <span className="w-1 h-1 bg-gray-400 rounded-full" />
              {feedback}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/**
 * Componente de indicador de risco de segurança
 */
const SecurityRiskIndicator: React.FC<{ riskLevel: string }> = ({ riskLevel }) => {
  const getRiskConfig = (level: string) => {
    switch (level) {
      case 'LOW':
        return { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle, text: 'Baixo Risco' };
      case 'MEDIUM':
        return { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertTriangle, text: 'Risco Médio' };
      case 'HIGH':
        return { color: 'text-orange-600', bg: 'bg-orange-100', icon: AlertTriangle, text: 'Alto Risco' };
      case 'CRITICAL':
        return { color: 'text-red-600', bg: 'bg-red-100', icon: AlertTriangle, text: 'Risco Crítico' };
      default:
        return { color: 'text-gray-600', bg: 'bg-gray-100', icon: Shield, text: 'Desconhecido' };
    }
  };
  
  const config = getRiskConfig(riskLevel);
  const Icon = config.icon;
  
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bg}`}>
      <Icon className={`w-4 h-4 ${config.color}`} />
      <span className={`text-sm font-medium ${config.color}`}>
        {config.text}
      </span>
    </div>
  );
};

/**
 * Componente principal de login seguro
 */
export const SecureLoginForm: React.FC<SecureLoginFormProps> = ({
  onLoginSuccess,
  onLoginError,
  className = ''
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, isLoading, error, riskLevel } = useSecureAuth();
  const { securityStats, loadSecurityStats } = useSecurityMonitoring();
  
  /**
   * Valida o email em tempo real
   */
  useEffect(() => {
    if (email && !isValidEmail(email)) {
      setEmailError('Email inválido');
    } else {
      setEmailError('');
    }
  }, [email]);
  
  /**
   * Carrega estatísticas quando o email é alterado
   */
  useEffect(() => {
    if (email && isValidEmail(email)) {
      loadSecurityStats();
    }
  }, [email, loadSecurityStats]);
  
  /**
   * Manipula o envio do formulário
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      return;
    }
    
    if (!isValidEmail(email)) {
      setEmailError('Email inválido');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await login(email, password);
      
      if (result.success) {
        onLoginSuccess?.();
      } else {
        onLoginError?.(result.error?.message || 'Erro no login');
      }
    } catch (err) {
      onLoginError?.('Erro interno do servidor');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  /**
   * Alterna visibilidade da senha
   */
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  return (
    <div className={`max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Login Seguro</h2>
        </div>
        <p className="text-gray-600">Sistema Revalya - Autenticação Protegida</p>
      </div>
      
      {/* Indicador de Risco */}
      {riskLevel !== 'LOW' && (
        <div className="mb-4">
          <SecurityRiskIndicator riskLevel={riskLevel} />
        </div>
      )}
      
      {/* Estatísticas de Segurança */}
      {securityStats && securityStats.failedAttempts > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              {securityStats.failedAttempts} tentativa(s) de login falhada(s) recente(s)
            </span>
          </div>
        </div>
      )}
      
      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Campo Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              emailError ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="seu@email.com"
            required
            disabled={isLoading || isSubmitting}
          />
          {emailError && (
            <p className="text-red-500 text-xs mt-1">{emailError}</p>
          )}
        </div>
        
        {/* Campo Senha */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Senha
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Sua senha"
              required
              disabled={isLoading || isSubmitting}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              disabled={isLoading || isSubmitting}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 text-gray-400" />
              ) : (
                <Eye className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
          
          {/* Indicador de força da senha */}
          <PasswordStrengthIndicator password={password} />
        </div>
        
        {/* Erro de autenticação */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-800">{error.message}</span>
            </div>
          </div>
        )}
        
        {/* Botão de Submit */}
        <button
          type="submit"
          disabled={isLoading || isSubmitting || !!emailError || !email || !password}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading || isSubmitting ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Entrando...
            </div>
          ) : (
            'Entrar'
          )}
        </button>
      </form>
      
      {/* Informações de Segurança */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Shield className="w-3 h-3" />
          <span>Protegido por autenticação JWT com monitoramento de segurança</span>
        </div>
        
        {securityStats && (
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>Score de Risco: {securityStats.riskScore}/100</div>
            <div>Dispositivos: {securityStats.deviceCount}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecureLoginForm;
