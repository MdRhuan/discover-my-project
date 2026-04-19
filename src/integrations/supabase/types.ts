export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alertas: {
        Row: {
          created_at: string
          empresa_id: number | null
          id: number
          lido: boolean
          mensagem: string
          modulo: string | null
          owner_id: string
          timestamp: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id?: number | null
          id?: number
          lido?: boolean
          mensagem: string
          modulo?: string | null
          owner_id?: string
          timestamp: string
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: number | null
          id?: number
          lido?: boolean
          mensagem?: string
          modulo?: string | null
          owner_id?: string
          timestamp?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          acao: string
          created_at: string
          id: number
          modulo: string | null
          owner_id: string
          timestamp: string
        }
        Insert: {
          acao: string
          created_at?: string
          id?: number
          modulo?: string | null
          owner_id?: string
          timestamp: string
        }
        Update: {
          acao?: string
          created_at?: string
          id?: number
          modulo?: string | null
          owner_id?: string
          timestamp?: string
        }
        Relationships: []
      }
      config: {
        Row: {
          chave: string
          created_at: string
          id: number
          owner_id: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          chave: string
          created_at?: string
          id?: number
          owner_id?: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          chave?: string
          created_at?: string
          id?: number
          owner_id?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      docs_pessoais: {
        Row: {
          categoria: string
          conteudo: string | null
          created_at: string
          data_upload: string | null
          descricao: string | null
          id: number
          nome: string
          owner_id: string
          pessoa: string
          status: string | null
          subcategoria: string
          tamanho: string | null
          tipo: string | null
          updated_at: string
          vencimento: string | null
        }
        Insert: {
          categoria: string
          conteudo?: string | null
          created_at?: string
          data_upload?: string | null
          descricao?: string | null
          id?: number
          nome: string
          owner_id?: string
          pessoa: string
          status?: string | null
          subcategoria: string
          tamanho?: string | null
          tipo?: string | null
          updated_at?: string
          vencimento?: string | null
        }
        Update: {
          categoria?: string
          conteudo?: string | null
          created_at?: string
          data_upload?: string | null
          descricao?: string | null
          id?: number
          nome?: string
          owner_id?: string
          pessoa?: string
          status?: string | null
          subcategoria?: string
          tamanho?: string | null
          tipo?: string | null
          updated_at?: string
          vencimento?: string | null
        }
        Relationships: []
      }
      documentos: {
        Row: {
          ano: string | null
          arquivo_path: string | null
          categoria: string
          created_at: string
          data_upload: string | null
          descricao: string | null
          empresa_id: number | null
          id: number
          nome: string
          owner_id: string
          status_doc: string | null
          subcategoria: string | null
          tags: string[] | null
          tamanho: string | null
          tipo: string | null
          updated_at: string
          vencimento: string | null
          versao: string | null
        }
        Insert: {
          ano?: string | null
          arquivo_path?: string | null
          categoria: string
          created_at?: string
          data_upload?: string | null
          descricao?: string | null
          empresa_id?: number | null
          id?: number
          nome: string
          owner_id?: string
          status_doc?: string | null
          subcategoria?: string | null
          tags?: string[] | null
          tamanho?: string | null
          tipo?: string | null
          updated_at?: string
          vencimento?: string | null
          versao?: string | null
        }
        Update: {
          ano?: string | null
          arquivo_path?: string | null
          categoria?: string
          created_at?: string
          data_upload?: string | null
          descricao?: string | null
          empresa_id?: number | null
          id?: number
          nome?: string
          owner_id?: string
          status_doc?: string | null
          subcategoria?: string | null
          tags?: string[] | null
          tamanho?: string | null
          tipo?: string | null
          updated_at?: string
          vencimento?: string | null
          versao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          ano_calendario: string | null
          cfc_class: string | null
          cfc_flag: boolean | null
          cidade: string | null
          cnpj: string | null
          created_at: string
          ctb_election: string | null
          data_encerramento: string | null
          ein: string | null
          estado: string | null
          fundacao: string | null
          id: number
          inscricao_estadual: string | null
          legal_type: string | null
          nome: string
          notas: string | null
          obrigacoes_acessorias: string | null
          owner_id: string
          pais: string
          setor: string | null
          status: string
          tax_regime: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          ano_calendario?: string | null
          cfc_class?: string | null
          cfc_flag?: boolean | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          ctb_election?: string | null
          data_encerramento?: string | null
          ein?: string | null
          estado?: string | null
          fundacao?: string | null
          id?: number
          inscricao_estadual?: string | null
          legal_type?: string | null
          nome: string
          notas?: string | null
          obrigacoes_acessorias?: string | null
          owner_id?: string
          pais?: string
          setor?: string | null
          status?: string
          tax_regime?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          ano_calendario?: string | null
          cfc_class?: string | null
          cfc_flag?: boolean | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          ctb_election?: string | null
          data_encerramento?: string | null
          ein?: string | null
          estado?: string | null
          fundacao?: string | null
          id?: number
          inscricao_estadual?: string | null
          legal_type?: string | null
          nome?: string
          notas?: string | null
          obrigacoes_acessorias?: string | null
          owner_id?: string
          pais?: string
          setor?: string | null
          status?: string
          tax_regime?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      fiscal_docs: {
        Row: {
          ano: string | null
          conteudo: string | null
          created_at: string
          data_upload: string | null
          descricao: string | null
          id: number
          jurisdicao: string | null
          nome: string
          owner_id: string
          responsavel: string | null
          status: string | null
          subcategoria: string
          tamanho: string | null
          tipo: string | null
          updated_at: string
          vencimento: string | null
        }
        Insert: {
          ano?: string | null
          conteudo?: string | null
          created_at?: string
          data_upload?: string | null
          descricao?: string | null
          id?: number
          jurisdicao?: string | null
          nome: string
          owner_id?: string
          responsavel?: string | null
          status?: string | null
          subcategoria: string
          tamanho?: string | null
          tipo?: string | null
          updated_at?: string
          vencimento?: string | null
        }
        Update: {
          ano?: string | null
          conteudo?: string | null
          created_at?: string
          data_upload?: string | null
          descricao?: string | null
          id?: number
          jurisdicao?: string | null
          nome?: string
          owner_id?: string
          responsavel?: string | null
          status?: string | null
          subcategoria?: string
          tamanho?: string | null
          tipo?: string | null
          updated_at?: string
          vencimento?: string | null
        }
        Relationships: []
      }
      funcionarios: {
        Row: {
          admissao: string | null
          cargo: string
          created_at: string
          departamento: string | null
          documento: string | null
          email: string | null
          empresa_id: number | null
          id: number
          moeda_salario: string | null
          nome: string
          owner_id: string
          pais: string | null
          salario: number | null
          status: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          admissao?: string | null
          cargo: string
          created_at?: string
          departamento?: string | null
          documento?: string | null
          email?: string | null
          empresa_id?: number | null
          id?: number
          moeda_salario?: string | null
          nome: string
          owner_id?: string
          pais?: string | null
          salario?: number | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          admissao?: string | null
          cargo?: string
          created_at?: string
          departamento?: string | null
          documento?: string | null
          email?: string | null
          empresa_id?: number | null
          id?: number
          moeda_salario?: string | null
          nome?: string
          owner_id?: string
          pais?: string | null
          salario?: number | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      health_plans: {
        Row: {
          acomodacao: string | null
          beneficiario_principal: string | null
          coparticipacao: boolean | null
          created_at: string
          dependentes: string | null
          id: number
          mensalidade: number | null
          modalidade: string | null
          moeda: string | null
          nome_plano: string | null
          observacoes: string | null
          operadora: string
          owner_id: string
          pessoa: string
          status: string | null
          updated_at: string
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          acomodacao?: string | null
          beneficiario_principal?: string | null
          coparticipacao?: boolean | null
          created_at?: string
          dependentes?: string | null
          id?: number
          mensalidade?: number | null
          modalidade?: string | null
          moeda?: string | null
          nome_plano?: string | null
          observacoes?: string | null
          operadora: string
          owner_id?: string
          pessoa: string
          status?: string | null
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          acomodacao?: string | null
          beneficiario_principal?: string | null
          coparticipacao?: boolean | null
          created_at?: string
          dependentes?: string | null
          id?: number
          mensalidade?: number | null
          modalidade?: string | null
          moeda?: string | null
          nome_plano?: string | null
          observacoes?: string | null
          operadora?: string
          owner_id?: string
          pessoa?: string
          status?: string | null
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: []
      }
      insurance_docs: {
        Row: {
          apolice_id: number | null
          apolice_label: string | null
          arquivo_path: string
          categoria: string | null
          created_at: string
          data_upload: string | null
          health_plan_id: number | null
          id: number
          insurance_type: string
          nome: string
          observacoes: string | null
          owner_id: string
          tamanho: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          apolice_id?: number | null
          apolice_label?: string | null
          arquivo_path: string
          categoria?: string | null
          created_at?: string
          data_upload?: string | null
          health_plan_id?: number | null
          id?: number
          insurance_type: string
          nome: string
          observacoes?: string | null
          owner_id?: string
          tamanho?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          apolice_id?: number | null
          apolice_label?: string | null
          arquivo_path?: string
          categoria?: string | null
          created_at?: string
          data_upload?: string | null
          health_plan_id?: number | null
          id?: number
          insurance_type?: string
          nome?: string
          observacoes?: string | null
          owner_id?: string
          tamanho?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_docs_health_plan_id_fkey"
            columns: ["health_plan_id"]
            isOneToOne: false
            referencedRelation: "health_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      org_edges: {
        Row: {
          cor: string | null
          created_at: string
          empresa_id: number | null
          espessura: number | null
          estilo: string | null
          id: number
          label: string | null
          owner_id: string
          source_id: number
          target_id: number
          updated_at: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          empresa_id?: number | null
          espessura?: number | null
          estilo?: string | null
          id?: number
          label?: string | null
          owner_id?: string
          source_id: number
          target_id: number
          updated_at?: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          empresa_id?: number | null
          espessura?: number | null
          estilo?: string | null
          id?: number
          label?: string | null
          owner_id?: string
          source_id?: number
          target_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_edges_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "org_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_edges_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "org_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      org_icons: {
        Row: {
          altura: number
          cor: string | null
          created_at: string
          empresa_id: number | null
          id: number
          largura: number
          nome: string | null
          owner_id: string
          pos_x: number
          pos_y: number
          rotacao: number | null
          svg_content: string
          updated_at: string
          z_index: number | null
        }
        Insert: {
          altura?: number
          cor?: string | null
          created_at?: string
          empresa_id?: number | null
          id?: number
          largura?: number
          nome?: string | null
          owner_id?: string
          pos_x?: number
          pos_y?: number
          rotacao?: number | null
          svg_content: string
          updated_at?: string
          z_index?: number | null
        }
        Update: {
          altura?: number
          cor?: string | null
          created_at?: string
          empresa_id?: number | null
          id?: number
          largura?: number
          nome?: string | null
          owner_id?: string
          pos_x?: number
          pos_y?: number
          rotacao?: number | null
          svg_content?: string
          updated_at?: string
          z_index?: number | null
        }
        Relationships: []
      }
      org_nodes: {
        Row: {
          cargo: string | null
          cor_borda: string | null
          cor_fundo: string | null
          created_at: string
          empresa_id: number | null
          espessura_borda: number | null
          estilo_borda: string | null
          icon: string | null
          id: number
          livre: boolean | null
          nome: string
          owner_id: string
          parent_id: number | null
          pos_x: number | null
          pos_y: number | null
          updated_at: string
          z_index: number | null
        }
        Insert: {
          cargo?: string | null
          cor_borda?: string | null
          cor_fundo?: string | null
          created_at?: string
          empresa_id?: number | null
          espessura_borda?: number | null
          estilo_borda?: string | null
          icon?: string | null
          id?: number
          livre?: boolean | null
          nome: string
          owner_id?: string
          parent_id?: number | null
          pos_x?: number | null
          pos_y?: number | null
          updated_at?: string
          z_index?: number | null
        }
        Update: {
          cargo?: string | null
          cor_borda?: string | null
          cor_fundo?: string | null
          created_at?: string
          empresa_id?: number | null
          espessura_borda?: number | null
          estilo_borda?: string | null
          icon?: string | null
          id?: number
          livre?: boolean | null
          nome?: string
          owner_id?: string
          parent_id?: number | null
          pos_x?: number | null
          pos_y?: number | null
          updated_at?: string
          z_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "org_nodes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      org_shapes: {
        Row: {
          altura: number
          cor_borda: string | null
          cor_fundo: string | null
          created_at: string
          empresa_id: number | null
          espessura_borda: number | null
          estilo_borda: string | null
          id: number
          largura: number
          opacidade: number | null
          owner_id: string
          pos_x: number
          pos_y: number
          raio: number | null
          rotulo: string | null
          updated_at: string
          z_index: number | null
        }
        Insert: {
          altura?: number
          cor_borda?: string | null
          cor_fundo?: string | null
          created_at?: string
          empresa_id?: number | null
          espessura_borda?: number | null
          estilo_borda?: string | null
          id?: number
          largura?: number
          opacidade?: number | null
          owner_id?: string
          pos_x?: number
          pos_y?: number
          raio?: number | null
          rotulo?: string | null
          updated_at?: string
          z_index?: number | null
        }
        Update: {
          altura?: number
          cor_borda?: string | null
          cor_fundo?: string | null
          created_at?: string
          empresa_id?: number | null
          espessura_borda?: number | null
          estilo_borda?: string | null
          id?: number
          largura?: number
          opacidade?: number | null
          owner_id?: string
          pos_x?: number
          pos_y?: number
          raio?: number | null
          rotulo?: string | null
          updated_at?: string
          z_index?: number | null
        }
        Relationships: []
      }
      org_texts: {
        Row: {
          chave: string | null
          created_at: string
          empresa_id: number | null
          id: number
          owner_id: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          chave?: string | null
          created_at?: string
          empresa_id?: number | null
          id?: number
          owner_id?: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          chave?: string | null
          created_at?: string
          empresa_id?: number | null
          id?: number
          owner_id?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      org_texts_canvas: {
        Row: {
          alinhamento: string | null
          conteudo: string
          cor: string | null
          created_at: string
          empresa_id: number | null
          fonte: string | null
          id: number
          italico: boolean | null
          largura: number | null
          negrito: boolean | null
          owner_id: string
          pos_x: number
          pos_y: number
          tamanho: number | null
          updated_at: string
          z_index: number | null
        }
        Insert: {
          alinhamento?: string | null
          conteudo?: string
          cor?: string | null
          created_at?: string
          empresa_id?: number | null
          fonte?: string | null
          id?: number
          italico?: boolean | null
          largura?: number | null
          negrito?: boolean | null
          owner_id?: string
          pos_x?: number
          pos_y?: number
          tamanho?: number | null
          updated_at?: string
          z_index?: number | null
        }
        Update: {
          alinhamento?: string | null
          conteudo?: string
          cor?: string | null
          created_at?: string
          empresa_id?: number | null
          fonte?: string | null
          id?: number
          italico?: boolean | null
          largura?: number | null
          negrito?: boolean | null
          owner_id?: string
          pos_x?: number
          pos_y?: number
          tamanho?: number | null
          updated_at?: string
          z_index?: number | null
        }
        Relationships: []
      }
      pessoas: {
        Row: {
          conjuge: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          descricao: string | null
          estado_civil: string | null
          id: number
          label: string | null
          nacionalidade: string | null
          naturalidade: string | null
          nome: string
          ordem: number
          owner_id: string
          passaporte_br: string | null
          passaporte_us: string | null
          residencia_fiscal: string | null
          rg: string | null
          ssn: string | null
          updated_at: string
        }
        Insert: {
          conjuge?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          descricao?: string | null
          estado_civil?: string | null
          id?: number
          label?: string | null
          nacionalidade?: string | null
          naturalidade?: string | null
          nome: string
          ordem?: number
          owner_id?: string
          passaporte_br?: string | null
          passaporte_us?: string | null
          residencia_fiscal?: string | null
          rg?: string | null
          ssn?: string | null
          updated_at?: string
        }
        Update: {
          conjuge?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          descricao?: string | null
          estado_civil?: string | null
          id?: number
          label?: string | null
          nacionalidade?: string | null
          naturalidade?: string | null
          nome?: string
          ordem?: number
          owner_id?: string
          passaporte_br?: string | null
          passaporte_us?: string | null
          residencia_fiscal?: string | null
          rg?: string | null
          ssn?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          categoria: string | null
          created_at: string
          descricao: string | null
          empresa_id: number | null
          id: number
          owner_id: string
          prioridade: string
          responsavel: string | null
          status: string
          tipo: string | null
          titulo: string
          updated_at: string
          vencimento: string | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id?: number | null
          id?: number
          owner_id?: string
          prioridade?: string
          responsavel?: string | null
          status?: string
          tipo?: string | null
          titulo: string
          updated_at?: string
          vencimento?: string | null
        }
        Update: {
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          empresa_id?: number | null
          id?: number
          owner_id?: string
          prioridade?: string
          responsavel?: string | null
          status?: string
          tipo?: string | null
          titulo?: string
          updated_at?: string
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      trademarks: {
        Row: {
          classe: string | null
          created_at: string
          data_deposito: string | null
          data_vencimento: string | null
          empresa_id: number | null
          id: number
          jurisdicao: string | null
          nome: string
          notas: string | null
          numero: string | null
          owner_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          classe?: string | null
          created_at?: string
          data_deposito?: string | null
          data_vencimento?: string | null
          empresa_id?: number | null
          id?: number
          jurisdicao?: string | null
          nome: string
          notas?: string | null
          numero?: string | null
          owner_id?: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          classe?: string | null
          created_at?: string
          data_deposito?: string | null
          data_vencimento?: string | null
          empresa_id?: number | null
          id?: number
          jurisdicao?: string | null
          nome?: string
          notas?: string | null
          numero?: string | null
          owner_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trademarks_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      transacoes: {
        Row: {
          categoria: string
          created_at: string
          data: string
          descricao: string | null
          empresa_id: number | null
          id: number
          moeda: string
          owner_id: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          categoria: string
          created_at?: string
          data: string
          descricao?: string | null
          empresa_id?: number | null
          id?: number
          moeda?: string
          owner_id?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data?: string
          descricao?: string | null
          empresa_id?: number | null
          id?: number
          moeda?: string
          owner_id?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_authorized: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
