# Identidade Visual - Nebula Finance

## 🎨 Tema: Glassmorphism Sóbrio

Esta documentação define a identidade visual do tema Nebula Finance, caracterizado por um design moderno com efeito glassmorphism sóbrio, utilizando uma paleta equilibrada de cores vibrantes sobre fundo escuro.

---

## 🌈 Paleta de Cores Principal

### Cores Primárias

#### **Primary**
- **Código:** `#111827`
- **RGB:** `rgb(17, 24, 39)`
- **HSL:** `hsl(220, 39%, 11%)`
- **Aplicação:** Cor principal do tema, usada em fundos de containers principais e base da interface

#### **Secondary** 
- **Código:** `#7C3AED`
- **RGB:** `rgb(124, 58, 237)`
- **HSL:** `hsl(262, 83%, 58%)`
- **Aplicação:** Cor secundária para elementos de destaque e componentes interativos principais

### Cores de Accent (Estados e Feedback)

#### **Accent (Info)**
- **Código:** `#60A5FA`
- **RGB:** `rgb(96, 165, 250)`
- **HSL:** `hsl(213, 93%, 68%)`
- **Aplicação:** Informações, botões informativos e elementos de navegação

#### **Accent (Warning)**
- **Código:** `#F59E0B`
- **RGB:** `rgb(245, 158, 11)`
- **HSL:** `hsl(38, 92%, 50%)`
- **Aplicação:** Alertas, avisos e elementos que requerem atenção

#### **Accent (Success)**
- **Código:** `#10B981`
- **RGB:** `rgb(16, 185, 129)`
- **HSL:** `hsl(160, 84%, 39%)`
- **Aplicação:** Confirmações, sucessos e estados positivos

### Efeitos Glassmorphism

#### **Glass Overlay**
- **Código:** `rgba(17, 24, 39, 0.6)`
- **RGB:** `rgb(17, 24, 39)` com 60% de opacidade
- **Aplicação:** Sobreposições translúcidas, modais e elementos flutuantes

---

## 🎭 Gradientes e Efeitos

### **Gradiente Principal**
```css
background: linear-gradient(135deg, #7C3AED 0%, #60A5FA 50%, #10B981 100%);
```
- **Aplicação:** Cards principais, elementos hero, barras de progresso

### **Gradiente de Fundo**
```css
background: linear-gradient(180deg, #111827 0%, #1F2937 100%);
```
- **Aplicação:** Fundos de seções, containers principais

### **Efeito Glassmorphism**
```css
background: rgba(17, 24, 39, 0.6);
backdrop-filter: blur(10px);
border: 1px solid rgba(255, 255, 255, 0.1);
```
- **Aplicação:** Cards flutuantes, modais, overlays

---

## 🎯 Aplicações por Contexto

### **Layout e Estrutura**
- **Fundo principal:** `#111827` (Primary)
- **Containers:** `rgba(17, 24, 39, 0.6)` (Glass Overlay)
- **Bordas:** `rgba(255, 255, 255, 0.1)` (Transparente)

### **Elementos Interativos**
- **Botões primários:** `#7C3AED` (Secondary)
- **Botões informativos:** `#60A5FA` (Accent Info)
- **Links:** `#60A5FA` (Accent Info)

### **Estados e Feedback**
- **Sucesso:** `#10B981` (Accent Success)
- **Atenção:** `#F59E0B` (Accent Warning)
- **Informação:** `#60A5FA` (Accent Info)
- **Erro:** `#EF4444` (Vermelho complementar)

### **Tipografia**
- **Texto principal:** `#FFFFFF` (Branco)
- **Texto secundário:** `#9CA3AF` (Cinza claro)
- **Texto de destaque:** `#60A5FA` (Accent Info)
- **Valores positivos:** `#10B981` (Success)
- **Valores negativos:** `#EF4444` (Erro)

---

## 📐 Princípios de Design

### **1. Glassmorphism Sóbrio**
- Uso moderado de transparências e blur
- Bordas sutis com baixa opacidade
- Efeitos que não comprometem a legibilidade

### **2. Contraste Inteligente**
- Cores vibrantes sobre fundo escuro
- Alto contraste para elementos importantes
- Transparências calculadas para manter legibilidade

### **3. Hierarquia Cromática**
- Primary para estrutura base
- Secondary para elementos principais
- Accents para estados e feedback específicos

### **4. Consistência Visual**
- Paleta limitada e bem definida
- Uso consistente de efeitos glassmorphism
- Gradientes aplicados de forma harmoniosa

---

## 🔧 Implementação Técnica

### **CSS Custom Properties**
```css
:root {
  /* Cores Principais */
  --nebula-primary: #111827;
  --nebula-secondary: #7C3AED;
  
  /* Accents */
  --nebula-accent-info: #60A5FA;
  --nebula-accent-warning: #F59E0B;
  --nebula-accent-success: #10B981;
  
  /* Glassmorphism */
  --nebula-glass-overlay: rgba(17, 24, 39, 0.6);
  --nebula-glass-border: rgba(255, 255, 255, 0.1);
  
  /* Gradientes */
  --nebula-gradient-primary: linear-gradient(135deg, #7C3AED 0%, #60A5FA 50%, #10B981 100%);
  --nebula-gradient-background: linear-gradient(180deg, #111827 0%, #1F2937 100%);
}
```

### **Tailwind CSS Configuration**
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        nebula: {
          primary: '#111827',
          secondary: '#7C3AED',
          'accent-info': '#60A5FA',
          'accent-warning': '#F59E0B',
          'accent-success': '#10B981'
        }
      },
      backdropBlur: {
        'glass': '10px'
      }
    }
  }
}
```

### **Componentes Base**

#### **Glass Card**
```css
.nebula-glass-card {
  background: var(--nebula-glass-overlay);
  backdrop-filter: blur(10px);
  border: 1px solid var(--nebula-glass-border);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

#### **Gradient Button**
```css
.nebula-gradient-button {
  background: var(--nebula-gradient-primary);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.nebula-gradient-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(124, 58, 237, 0.4);
}
```

#### **Status Badge**
```css
.nebula-status-success {
  background: var(--nebula-accent-success);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.nebula-status-warning {
  background: var(--nebula-accent-warning);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}
```

---

## 📱 Responsividade e Adaptação

### **Mobile First**
- Reduzir efeitos de blur em dispositivos móveis para performance
- Manter contraste em telas pequenas
- Simplificar gradientes quando necessário

### **Performance**
- Usar `will-change: backdrop-filter` apenas quando necessário
- Otimizar transparências para GPUs mais antigas
- Fallbacks para navegadores sem suporte a backdrop-filter

### **Acessibilidade**
- Manter contraste mínimo de 4.5:1 para texto normal
- Contraste de 3:1 para texto grande
- Opção para reduzir transparências (prefers-reduced-transparency)

---

## 🎨 Exemplos de Uso

### **Dashboard Card**
```css
.nebula-dashboard-card {
  background: var(--nebula-glass-overlay);
  backdrop-filter: blur(10px);
  border: 1px solid var(--nebula-glass-border);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}
```

### **Action Button**
```css
.nebula-action-button {
  background: var(--nebula-secondary);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.nebula-action-button:hover {
  background: #8B5CF6;
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(124, 58, 237, 0.3);
}
```

### **Input Field**
```css
.nebula-input {
  background: var(--nebula-glass-overlay);
  backdrop-filter: blur(5px);
  border: 1px solid var(--nebula-glass-border);
  border-radius: 12px;
  padding: 12px 16px;
  color: white;
  transition: all 0.3s ease;
}

.nebula-input:focus {
  border-color: var(--nebula-accent-info);
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
}
```

---

## 📊 Paleta de Status

### **Transações e Valores**
- **Receita/Positivo:** `#10B981` (Success)
- **Despesa/Negativo:** `#EF4444` (Erro)
- **Neutro/Informativo:** `#60A5FA` (Info)
- **Pendente/Atenção:** `#F59E0B` (Warning)

### **Estados de Sistema**
- **Ativo/Online:** `#10B981` (Success)
- **Inativo/Offline:** `#6B7280` (Cinza)
- **Processando:** `#60A5FA` (Info)
- **Erro/Falha:** `#EF4444` (Erro)

---

## 📋 Checklist de Implementação

- [ ] Configurar CSS custom properties
- [ ] Implementar componentes base com glassmorphism
- [ ] Testar performance em dispositivos móveis
- [ ] Validar contraste de acessibilidade
- [ ] Implementar fallbacks para navegadores antigos
- [ ] Criar biblioteca de componentes reutilizáveis
- [ ] Documentar padrões de uso para equipe
- [ ] Testar em diferentes resoluções e dispositivos

---

**Versão:** 1.0  
**Data:** Janeiro 2025  
**Autor:** Equipe de Design Revalya  
**Status:** Aprovado para implementação  
**Tema:** Glassmorphism Sóbrio