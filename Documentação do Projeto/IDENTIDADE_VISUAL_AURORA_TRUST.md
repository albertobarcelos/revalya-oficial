# Identidade Visual - Aurora Trust

## 🎨 Tema: Futurista • Brilho Discreto

Esta documentação define a identidade visual do tema Aurora Trust, caracterizado por um design moderno e sofisticado com tons de azul e roxo, criando uma atmosfera futurista com brilho discreto.

---

## 🌈 Paleta de Cores Principal

### Cores Primárias

#### **Primary**
- **Código:** `#1C2756`
- **RGB:** `rgb(28, 39, 86)`
- **HSL:** `hsl(228, 51%, 22%)`
- **Aplicação:** Cor principal do tema, usada em fundos de containers principais e elementos de destaque

#### **Secondary** 
- **Código:** `#5531B5`
- **RGB:** `rgb(85, 49, 181)`
- **HSL:** `hsl(256, 57%, 45%)`
- **Aplicação:** Cor secundária para botões, links e elementos interativos

#### **Accent (Hover/Active)**
- **Código:** `#7C3AED`
- **RGB:** `rgb(124, 58, 237)`
- **HSL:** `hsl(262, 83%, 58%)`
- **Aplicação:** Estados de hover, elementos ativos e destaques visuais

### Cores de Superfície

#### **Surface**
- **Código:** `#0D1024`
- **RGB:** `rgb(13, 16, 36)`
- **HSL:** `hsl(222, 47%, 10%)`
- **Aplicação:** Fundo principal da aplicação, criando contraste com os elementos

#### **Stroke Suave**
- **Código:** `#2B3569`
- **RGB:** `rgb(43, 53, 105)`
- **HSL:** `hsl(230, 42%, 29%)`
- **Aplicação:** Bordas sutis, divisores e contornos de elementos

#### **Halo Suave**
- **Código:** `#9A8CFB`
- **RGB:** `rgb(154, 140, 251)`
- **HSL:** `hsl(248, 92%, 77%)`
- **Aplicação:** Efeitos de brilho, sombras coloridas e elementos de destaque suave

---

## 🎭 Gradientes

### **Gradiente Principal**
```css
background: linear-gradient(135deg, #5531B5 0%, #7C3AED 50%, #9A8CFB 100%);
```
- **Aplicação:** Cards principais, botões de destaque, elementos hero

### **Gradiente de Fundo**
```css
background: linear-gradient(180deg, #0D1024 0%, #1C2756 100%);
```
- **Aplicação:** Fundos de seções, overlays

---

## 🎯 Aplicações por Contexto

### **Navegação e Layout**
- **Fundo principal:** `#0D1024` (Surface)
- **Containers:** `#1C2756` (Primary)
- **Bordas:** `#2B3569` (Stroke Suave)

### **Elementos Interativos**
- **Botões primários:** `#5531B5` (Secondary)
- **Hover state:** `#7C3AED` (Accent)
- **Links:** `#9A8CFB` (Halo Suave)

### **Estados e Feedback**
- **Sucesso:** `#10B981` (Verde complementar)
- **Atenção:** `#F59E0B` (Âmbar complementar)
- **Erro:** `#EF4444` (Vermelho complementar)
- **Info:** `#3B82F6` (Azul complementar)

### **Tipografia**
- **Texto principal:** `#FFFFFF` (Branco)
- **Texto secundário:** `#9CA3AF` (Cinza claro)
- **Texto de destaque:** `#9A8CFB` (Halo Suave)

---

## 📐 Princípios de Design

### **1. Contraste Elevado**
- Garantir legibilidade com alto contraste entre texto e fundo
- Usar cores claras sobre fundos escuros

### **2. Hierarquia Visual**
- Primary para elementos principais
- Secondary para ações importantes
- Accent para estados interativos

### **3. Consistência**
- Manter a paleta em todos os componentes
- Usar gradientes de forma consistente

### **4. Acessibilidade**
- Respeitar padrões WCAG 2.1 AA
- Testar contraste de cores regularmente

---

## 🔧 Implementação Técnica

### **CSS Custom Properties**
```css
:root {
  /* Cores Principais */
  --aurora-primary: #1C2756;
  --aurora-secondary: #5531B5;
  --aurora-accent: #7C3AED;
  
  /* Superfícies */
  --aurora-surface: #0D1024;
  --aurora-stroke: #2B3569;
  --aurora-halo: #9A8CFB;
  
  /* Gradientes */
  --aurora-gradient-primary: linear-gradient(135deg, #5531B5 0%, #7C3AED 50%, #9A8CFB 100%);
  --aurora-gradient-background: linear-gradient(180deg, #0D1024 0%, #1C2756 100%);
}
```

### **Tailwind CSS Configuration**
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        aurora: {
          primary: '#1C2756',
          secondary: '#5531B5',
          accent: '#7C3AED',
          surface: '#0D1024',
          stroke: '#2B3569',
          halo: '#9A8CFB'
        }
      }
    }
  }
}
```

---

## 📱 Responsividade

### **Mobile First**
- Manter contraste em telas pequenas
- Ajustar gradientes para performance
- Simplificar efeitos de brilho em dispositivos móveis

### **Dark Mode**
- Este tema é otimizado para modo escuro
- Cores já ajustadas para reduzir fadiga visual
- Brilho controlado para uso noturno

---

## 🎨 Exemplos de Uso

### **Card Principal**
```css
.aurora-card {
  background: var(--aurora-gradient-primary);
  border: 1px solid var(--aurora-stroke);
  box-shadow: 0 8px 32px rgba(124, 58, 237, 0.2);
}
```

### **Botão Primário**
```css
.aurora-button {
  background: var(--aurora-secondary);
  color: white;
  transition: all 0.3s ease;
}

.aurora-button:hover {
  background: var(--aurora-accent);
  box-shadow: 0 4px 16px rgba(124, 58, 237, 0.4);
}
```

### **Input Field**
```css
.aurora-input {
  background: var(--aurora-primary);
  border: 1px solid var(--aurora-stroke);
  color: white;
}

.aurora-input:focus {
  border-color: var(--aurora-accent);
  box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
}
```

---

## 📋 Checklist de Implementação

- [ ] Aplicar paleta de cores em todos os componentes
- [ ] Configurar CSS custom properties
- [ ] Implementar gradientes nos elementos principais
- [ ] Testar contraste de acessibilidade
- [ ] Validar responsividade em diferentes dispositivos
- [ ] Documentar variações para estados especiais
- [ ] Criar guia de uso para desenvolvedores

---

**Versão:** 1.0  
**Data:** Janeiro 2025  
**Autor:** Equipe de Design Revalya  
**Status:** Aprovado para implementação