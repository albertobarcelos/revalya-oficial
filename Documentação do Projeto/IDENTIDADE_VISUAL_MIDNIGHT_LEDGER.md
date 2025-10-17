# Identidade Visual - Midnight Ledger

## 🌙 Tema: Sério • Premium • Dark Total

Esta documentação define a identidade visual do tema Midnight Ledger, caracterizado por um design premium e profissional com paleta escura total, focado em seriedade e elegância para aplicações financeiras corporativas.

---

## 🌈 Paleta de Cores Principal

### Cores Estruturais

#### **Primary (Navegação/CTA)**
- **Código:** `#1F2A44`
- **RGB:** `rgb(31, 42, 68)`
- **HSL:** `hsl(222, 37%, 19%)`
- **Aplicação:** Cor principal para navegação, CTAs primários e elementos estruturais principais

#### **Background (App)**
- **Código:** `#0F1220`
- **RGB:** `rgb(15, 18, 32)`
- **HSL:** `hsl(229, 36%, 9%)`
- **Aplicação:** Fundo principal da aplicação, cor base mais escura

#### **Elevations/Cards**
- **Código:** `#161B2F`
- **RGB:** `rgb(22, 27, 47)`
- **HSL:** `hsl(228, 36%, 14%)`
- **Aplicação:** Cards, modais, elementos elevados e containers secundários

### Cores de Destaque

#### **Secondary (Destaques)**
- **Código:** `#5B2E91`
- **RGB:** `rgb(91, 46, 145)`
- **HSL:** `hsl(267, 52%, 37%)`
- **Aplicação:** Elementos de destaque, badges importantes e indicadores especiais

#### **Accent (Links/Ativos)**
- **Código:** `#3B82F6`
- **RGB:** `rgb(59, 130, 246)`
- **HSL:** `hsl(217, 91%, 60%)`
- **Aplicação:** Links, botões ativos, elementos interativos e CTAs secundários

---

## 🎭 Gradientes e Efeitos

### **Gradiente Principal**
```css
background: linear-gradient(135deg, #5B2E91 0%, #3B82F6 100%);
```
- **Aplicação:** Barras de progresso, elementos hero, botões premium

### **Gradiente de Fundo Sutil**
```css
background: linear-gradient(180deg, #0F1220 0%, #161B2F 100%);
```
- **Aplicação:** Fundos de seções, transições suaves entre containers

### **Efeito de Elevação**
```css
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
border: 1px solid rgba(255, 255, 255, 0.05);
```
- **Aplicação:** Cards principais, modais, elementos flutuantes

---

## 🎯 Aplicações por Contexto

### **Layout e Estrutura**
- **Fundo principal:** `#0F1220` (Background App)
- **Containers/Cards:** `#161B2F` (Elevations)
- **Navegação:** `#1F2A44` (Primary)
- **Bordas sutis:** `rgba(255, 255, 255, 0.05)`

### **Elementos Interativos**
- **Botões primários:** `#3B82F6` (Accent)
- **Botões secundários:** `#1F2A44` (Primary)
- **Botões premium:** Gradiente `#5B2E91` → `#3B82F6`
- **Links:** `#3B82F6` (Accent)

### **Estados e Feedback**
- **Sucesso:** `#10B981` (Verde)
- **Atenção:** `#F59E0B` (Laranja)
- **Erro:** `#EF4444` (Vermelho)
- **Informação:** `#3B82F6` (Accent)
- **Neutro:** `#6B7280` (Cinza)

### **Tipografia**
- **Texto principal:** `#FFFFFF` (Branco)
- **Texto secundário:** `#9CA3AF` (Cinza claro)
- **Texto de destaque:** `#3B82F6` (Accent)
- **Valores positivos:** `#10B981` (Verde)
- **Valores negativos:** `#EF4444` (Vermelho)

---

## 📐 Princípios de Design

### **1. Profissionalismo Premium**
- Paleta escura total para reduzir fadiga visual
- Contrastes calculados para máxima legibilidade
- Hierarquia visual clara e consistente

### **2. Seriedade Corporativa**
- Cores sóbrias e elegantes
- Evitar cores muito vibrantes ou chamativas
- Foco na funcionalidade e usabilidade

### **3. Dark Total Otimizado**
- Diferentes tons de escuro para criar profundidade
- Bordas e separadores sutis
- Iluminação estratégica em elementos importantes

### **4. Consistência Visual**
- Paleta limitada e bem definida
- Uso consistente de elevações
- Padrões repetíveis em toda a aplicação

---

## 🔧 Implementação Técnica

### **CSS Custom Properties**
```css
:root {
  /* Cores Estruturais */
  --midnight-primary: #1F2A44;
  --midnight-background: #0F1220;
  --midnight-elevations: #161B2F;
  
  /* Cores de Destaque */
  --midnight-secondary: #5B2E91;
  --midnight-accent: #3B82F6;
  
  /* Estados */
  --midnight-success: #10B981;
  --midnight-warning: #F59E0B;
  --midnight-error: #EF4444;
  --midnight-info: #3B82F6;
  
  /* Tipografia */
  --midnight-text-primary: #FFFFFF;
  --midnight-text-secondary: #9CA3AF;
  --midnight-text-muted: #6B7280;
  
  /* Bordas e Separadores */
  --midnight-border: rgba(255, 255, 255, 0.05);
  --midnight-border-hover: rgba(255, 255, 255, 0.1);
  
  /* Gradientes */
  --midnight-gradient-primary: linear-gradient(135deg, #5B2E91 0%, #3B82F6 100%);
  --midnight-gradient-background: linear-gradient(180deg, #0F1220 0%, #161B2F 100%);
}
```

### **Tailwind CSS Configuration**
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        midnight: {
          primary: '#1F2A44',
          background: '#0F1220',
          elevations: '#161B2F',
          secondary: '#5B2E91',
          accent: '#3B82F6',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444'
        }
      },
      boxShadow: {
        'midnight': '0 4px 20px rgba(0, 0, 0, 0.4)',
        'midnight-lg': '0 8px 32px rgba(0, 0, 0, 0.5)'
      }
    }
  }
}
```

### **Componentes Base**

#### **Card Principal**
```css
.midnight-card {
  background: var(--midnight-elevations);
  border: 1px solid var(--midnight-border);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  padding: 24px;
  transition: all 0.3s ease;
}

.midnight-card:hover {
  border-color: var(--midnight-border-hover);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}
```

#### **Botão Premium**
```css
.midnight-button-premium {
  background: var(--midnight-gradient-primary);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.midnight-button-premium:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
}
```

#### **Botão Secundário**
```css
.midnight-button-secondary {
  background: var(--midnight-primary);
  color: white;
  border: 1px solid var(--midnight-border);
  border-radius: 12px;
  padding: 12px 24px;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.midnight-button-secondary:hover {
  background: #2A3A54;
  border-color: var(--midnight-border-hover);
}
```

#### **Input Field**
```css
.midnight-input {
  background: var(--midnight-background);
  border: 1px solid var(--midnight-border);
  border-radius: 8px;
  padding: 12px 16px;
  color: var(--midnight-text-primary);
  font-size: 14px;
  transition: all 0.3s ease;
}

.midnight-input:focus {
  outline: none;
  border-color: var(--midnight-accent);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.midnight-input::placeholder {
  color: var(--midnight-text-muted);
}
```

---

## 📱 Responsividade e Performance

### **Mobile First**
- Manter contraste em telas pequenas
- Simplificar sombras em dispositivos móveis
- Otimizar gradientes para performance

### **Performance**
- Usar `transform` e `opacity` para animações
- Evitar `box-shadow` complexas em elementos que animam
- Otimizar gradientes para GPUs

### **Acessibilidade**
- Contraste mínimo de 4.5:1 para texto normal
- Contraste de 3:1 para texto grande
- Suporte a `prefers-color-scheme: dark`
- Indicadores visuais claros para estados de foco

---

## 🎨 Exemplos de Uso

### **Dashboard Card**
```css
.midnight-dashboard-card {
  background: var(--midnight-elevations);
  border: 1px solid var(--midnight-border);
  border-radius: 20px;
  padding: 32px;
  box-shadow: var(--midnight-shadow);
}

.midnight-dashboard-value {
  color: var(--midnight-text-primary);
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
}

.midnight-dashboard-label {
  color: var(--midnight-text-secondary);
  font-size: 14px;
  font-weight: 500;
}
```

### **Status Badge**
```css
.midnight-status-confirmed {
  background: var(--midnight-success);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.midnight-status-pending {
  background: var(--midnight-warning);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}
```

### **Navigation Item**
```css
.midnight-nav-item {
  background: transparent;
  color: var(--midnight-text-secondary);
  padding: 12px 16px;
  border-radius: 8px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.midnight-nav-item:hover {
  background: var(--midnight-primary);
  color: var(--midnight-text-primary);
}

.midnight-nav-item.active {
  background: var(--midnight-accent);
  color: white;
}
```

---

## 📊 Paleta de Status Financeiro

### **Transações e Valores**
- **Receita/Entrada:** `#10B981` (Verde)
- **Despesa/Saída:** `#EF4444` (Vermelho)
- **Transferência:** `#3B82F6` (Azul)
- **Investimento:** `#5B2E91` (Roxo)

### **Estados de Transação**
- **Confirmado:** `#10B981` (Verde)
- **Pendente:** `#F59E0B` (Laranja)
- **Cancelado:** `#6B7280` (Cinza)
- **Erro:** `#EF4444` (Vermelho)

### **Indicadores de Performance**
- **Positivo:** `#10B981` (Verde)
- **Negativo:** `#EF4444` (Vermelho)
- **Neutro:** `#6B7280` (Cinza)
- **Destaque:** `#3B82F6` (Azul)

---

## 🔍 Variações de Contexto

### **Modo Foco (Trabalho Noturno)**
- Reduzir brilho dos acentos em 20%
- Aumentar contraste de texto
- Minimizar elementos decorativos

### **Modo Apresentação**
- Aumentar contraste geral
- Destacar elementos importantes
- Simplificar animações

### **Modo Acessibilidade**
- Aumentar contraste para WCAG AAA
- Remover gradientes complexos
- Simplificar efeitos visuais

---

## 📋 Checklist de Implementação

- [ ] Configurar CSS custom properties
- [ ] Implementar componentes base
- [ ] Testar contraste de acessibilidade (WCAG AA)
- [ ] Validar performance em dispositivos móveis
- [ ] Implementar estados de hover e focus
- [ ] Criar biblioteca de componentes reutilizáveis
- [ ] Documentar padrões para equipe
- [ ] Testar em diferentes resoluções
- [ ] Validar legibilidade em ambientes escuros
- [ ] Implementar fallbacks para navegadores antigos

---

## 🎯 Diretrizes de Uso

### **Quando Usar**
- Aplicações financeiras corporativas
- Dashboards profissionais
- Sistemas de gestão empresarial
- Ambientes de trabalho prolongado

### **Evitar**
- Aplicações casuais ou recreativas
- Públicos jovens ou criativos
- Contextos que exigem cores vibrantes
- Ambientes com muita luz natural

### **Combinações Recomendadas**
- Midnight + tipografia clean (Inter, Roboto)
- Midnight + ícones outline minimalistas
- Midnight + animações sutis e profissionais

---

**Versão:** 1.0  
**Data:** Janeiro 2025  
**Autor:** Equipe de Design Revalya  
**Status:** Aprovado para implementação  
**Tema:** Sério • Premium • Dark Total