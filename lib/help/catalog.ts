export type HelpStep = { title: string; text: string };
export type HelpTopic = {
  id: string;
  title: string;
  summary: string;
  routes: readonly string[];
  destination: string;
  steps: readonly HelpStep[];
};

export const helpTopics: readonly HelpTopic[] = [
  { id: "home", title: "Início", summary: "Encontre a próxima ação e navegue pelo cuidado.", routes: ["/"], destination: "/", steps: [
    { title: "Confira a pessoa ativa", text: "Antes de registrar, confira o perfil. Medicamentos, documentos e registros de saúde pertencem à pessoa selecionada." },
    { title: "Comece pela prioridade", text: "Os avisos resumem os dados cadastrados. Abra a ação para conferir o registro de origem e atualizar o que realmente aconteceu." },
    { title: "Use a lupa VAULT Brain", text: "Procure medicamentos, documentos ou uma área do aplicativo. O botão central abre as opções de cadastro." },
  ] },
  { id: "today", title: "Hoje e doses", summary: "Revise horários, tomadas e compromissos por data.", routes: ["/hoje"], destination: "/hoje", steps: [
    { title: "Confira data e horário", text: "Hoje reúne a rotina da data selecionada. Uma dose futura ainda não está atrasada. Abra o calendário para consultar outro dia." },
    { title: "Confirme o que aconteceu", text: "Revise medicamento, quantidade e horário antes de confirmar uma tomada. Ignorada e sem confirmação são estados diferentes. SOS e extra têm registro próprio." },
    { title: "Revise o passado com cuidado", text: "Use o histórico para conferir dias anteriores. Compra, receita ou lembrete não confirmam automaticamente que uma dose foi tomada." },
  ] },
  { id: "medications", title: "Medicamentos", summary: "Organize identidade, rotina, estoque e documentos.", routes: ["/saude/medicamentos"], destination: "/saude/medicamentos", steps: [
    { title: "Cadastre a rotina prescrita", text: "Informe nome, dosagem e formato. Diferencie uso contínuo, por período e SOS conforme sua prescrição e confira os horários antes de salvar." },
    { title: "Acompanhe o saldo", text: "Repor estoque registra o medicamento recebido. Informar saldo registra uma contagem. Estoque desconhecido precisa de conferência; uma receita anexada não adiciona unidades." },
    { title: "Abra os detalhes", text: "Nos detalhes você encontra rotina, histórico de doses, receitas, fornecimento e edição. Confira os vínculos antes de alterar um registro." },
  ] },
  { id: "medication-detail", title: "Detalhes e histórico do medicamento", summary: "Confira a rotina e os registros que sustentam o saldo.", routes: ["/saude/medicamentos/detalhes", "/saude/medicamentos/historico", "/saude/medicamentos/saldo"], destination: "/saude/medicamentos", steps: [
    { title: "Identifique o medicamento", text: "Confira nome, dosagem e pessoa. A identidade visual ajuda a reconhecer o cadastro; a referência de catálogo precisa ser conferida com a prescrição." },
    { title: "Leia a origem das informações", text: "Estoque, receita e fornecimento têm históricos próprios. Uma estimativa de duração depende da rotina e dos registros disponíveis." },
    { title: "Revise antes de corrigir", text: "Abra o histórico para consultar tomadas e ignoradas. Ao corrigir um dia passado, confirme a data e a quantidade efetivamente tomada." },
  ] },
  { id: "medication-form", title: "Cadastrar e editar medicamento", summary: "Preencha identidade, rotina e revisão com segurança.", routes: ["/saude/medicamentos/novo", "/saude/medicamentos/editar"], destination: "/saude/medicamentos", steps: [
    { title: "Identidade e referência", text: "Informe nome, dosagem e apresentação. A busca do catálogo ajuda a localizar referências; similaridade de nomes não comprova equivalência clínica." },
    { title: "Rotina conforme a prescrição", text: "Confira quantidade por dose, horários e tipo de uso. Para uso por período, confira início e duração. SOS deve continuar identificado como uso quando necessário." },
    { title: "Confira antes de salvar", text: "Revise pessoa, vínculos e dados preenchidos. Uma alteração de dosagem tem histórico próprio. Cadastro de medicamento e aquisição são registros distintos." },
  ] },
  { id: "treatments", title: "Tratamentos", summary: "Conecte acompanhamentos, medicamentos e documentos.", routes: ["/saude/tratamentos"], destination: "/saude/tratamentos", steps: [
    { title: "Descreva o acompanhamento", text: "Cadastre o tratamento e sua situação. Nome, cor e ícone ajudam a reconhecer a linha de cuidado." },
    { title: "Vincule registros existentes", text: "Relacione medicamentos, profissionais, documentos e processos pertinentes. Um vínculo organiza o histórico e não comprova atendimento ou fornecimento." },
    { title: "Consulte o dossiê", text: "Os detalhes reúnem as relações registradas. Use o dossiê para preparar consultas e conferir o que ainda precisa de atualização." },
  ] },
  { id: "prescriptions", title: "Receitas e recebimentos", summary: "Registre prescrições, compras e retiradas separadamente.", routes: ["/saude/renovacao"], destination: "/saude/renovacao", steps: [
    { title: "Escolha o evento certo", text: "Receita recebida registra o documento. Compra ou retirada realizada registra o recebimento. Planejamento descreve uma intenção futura." },
    { title: "Confira data e unidades", text: "Registre a data real e a quantidade recebida na unidade do estoque. Uma caixa não equivale automaticamente a um comprimido ou cápsula." },
    { title: "Anexe e relacione", text: "Associe a receita ou comprovante ao evento correto. Uma data passada de aquisição não confirma tomadas dos dias anteriores." },
  ] },
  { id: "withdrawals", title: "Retiradas", summary: "Organize agendamentos, locais e recebimentos.", routes: ["/saude/retiradas"], destination: "/saude/retiradas", steps: [
    { title: "Agende com o local correto", text: "Selecione medicamento, data e local. Confira a pessoa e as exigências registradas no canal de fornecimento." },
    { title: "Registre o desfecho", text: "Agendada, realizada, cancelada e não realizada representam situações diferentes. Só confirme recebimento depois que ele acontecer." },
    { title: "Confira o histórico", text: "Consulte datas e quantidades recebidas e os documentos relacionados. Reagendar deve manter o histórico anterior disponível." },
  ] },
  { id: "supply", title: "Fornecimento e SUS", summary: "Acompanhe processos, canais e documentos exigidos.", routes: ["/saude/fornecimento"], destination: "/saude/fornecimento", steps: [
    { title: "Identifique o canal", text: "SUS municipal, SUS estadual e compra particular podem ter exigências diferentes. Confira o processo ativo que sustenta cada origem." },
    { title: "Organize o ciclo", text: "Relacione receitas, documentos do processo, autorizações e retiradas ao ciclo correspondente. Um comprovante de compra não substitui a receita." },
    { title: "Prepare a próxima etapa", text: "Consulte pendências e datas. A compra particular de um medicamento não cria, por si só, obrigação documental SUS." },
  ] },
  { id: "health-documents", title: "Documentos de saúde", summary: "Guarde receitas, exames e laudos com seus vínculos.", routes: ["/saude/documentos"], destination: "/saude/documentos", steps: [
    { title: "Classifique o documento", text: "Escolha o tipo e confira pessoa, emissão e validade quando informadas. Diferencie receita, laudo, exame e documento de processo." },
    { title: "Anexe e vincule", text: "Adicione o arquivo e relacione o registro ao medicamento, consulta ou tratamento correspondente. Confira se o anexo pertence ao evento exibido." },
    { title: "Consulte a origem", text: "Abra o documento para conferir o conteúdo. A existência de um anexo não comprova compra, retirada ou tomada de dose." },
  ] },
  { id: "appointments", title: "Consultas", summary: "Prepare e registre seus atendimentos.", routes: ["/saude/consultas"], destination: "/saude/consultas", steps: [
    { title: "Agende o atendimento", text: "Informe data, profissional e local disponíveis. Confira a pessoa e os vínculos do acompanhamento." },
    { title: "Prepare o resumo", text: "Reúna dúvidas, sintomas e documentos pertinentes. O relatório ajuda a conversar com o profissional a partir do histórico registrado." },
    { title: "Atualize depois", text: "Registre o atendimento realizado e seus anexos. Uma consulta futura permanece agendada até que você informe o desfecho." },
  ] },
  { id: "exams", title: "Exames", summary: "Relacione pedidos, agendamento e resultados.", routes: ["/saude/exames"], destination: "/saude/exames", steps: [
    { title: "Cadastre o pedido", text: "Informe o exame e vincule profissional ou tratamento quando pertinente. Confira a pessoa do registro." },
    { title: "Acompanhe a realização", text: "Registre agendamento e realização conforme acontecerem. Um pedido ou uma data futura não comprova exame realizado." },
    { title: "Guarde o resultado", text: "Anexe o resultado e consulte seu histórico. A interpretação clínica deve ser discutida com o profissional responsável." },
  ] },
  { id: "surgeries", title: "Cirurgias e procedimentos", summary: "Organize preparo, realização e acompanhamento.", routes: ["/saude/cirurgias"], destination: "/saude/cirurgias", steps: [
    { title: "Organize o procedimento", text: "Confira pessoa, procedimento, datas, equipe e local conforme seus registros." },
    { title: "Reúna o preparo", text: "Vincule consultas, exames e documentos pertinentes. Etapas planejadas continuam identificadas como planejamento." },
    { title: "Acompanhe a recuperação", text: "Atualize o desfecho e mantenha orientações e registros no dossiê. O aplicativo organiza informações para o acompanhamento profissional." },
  ] },
  { id: "my-health", title: "Minha Saúde", summary: "Consulte Avatar, medidas, tendências e fontes.", routes: ["/saude/minha-saude"], destination: "/saude/minha-saude", steps: [
    { title: "Confira as medidas", text: "Consulte data e origem de peso, sono e outros indicadores. Ausência de medida significa informação desconhecida." },
    { title: "Explore a Fênix", text: "O Avatar apresenta contexto dos registros disponíveis. Sua aparência e os sinais exibidos não representam diagnóstico." },
    { title: "Confira as fontes", text: "Abra fontes e sincronização para conferir aparelhos e origem das medidas. Tendências dependem do período e da cobertura dos registros." },
  ] },
  { id: "insights", title: "Vault Insight", summary: "Entenda prioridades, evidências e limites dos sinais.", routes: ["/inteligencia"], destination: "/inteligencia", steps: [
    { title: "Comece pela decisão", text: "O Próximo passo organiza ações a partir dos registros disponíveis. Abra a origem para conferir a situação e decidir o que registrar." },
    { title: "Leia a evidência", text: "Confira período, amostra, fonte e confiança quando disponíveis. Um fato registrado, uma projeção e uma associação têm significados diferentes." },
    { title: "Use como preparação", text: "Leve padrões observados ao acompanhamento profissional. Ausência de confirmação não comprova que você deixou de tomar e uma associação não prova causa." },
  ] },
  { id: "commands", title: "VAULT Brain · Comandos", summary: "Use a lupa para localizar registros e caminhos.", routes: [], destination: "/", steps: [
    { title: "Escreva sua intenção", text: "Abra a lupa na Home e procure uma área ou um medicamento. Experimente Hoje, tratamentos ou o nome de um medicamento cadastrado." },
    { title: "Escolha o resultado", text: "Confira a categoria e o destino apresentado. Se houver mais de um registro semelhante, escolha o que pertence à pessoa e ao evento desejados." },
    { title: "Revise no formulário", text: "Abrir um resultado não confirma uma tomada ou aquisição. Confira os dados e confirme no formulário. Recursos de voz dependem da disponibilidade do dispositivo." },
  ] },
  { id: "records", title: "Registros e linha de cuidado", summary: "Registre sintomas, humor e evolução por data.", routes: ["/saude/registros", "/saude/timeline"], destination: "/saude/registros", steps: [
    { title: "Registre o observado", text: "Informe data, horário e o que você observou. Confira a pessoa antes de salvar." },
    { title: "Consulte o período", text: "Use o histórico e o relatório para reunir medidas, sintomas e doses. Dias sem registro não são tratados como ausência de sintomas." },
    { title: "Prepare a conversa", text: "O histórico pode ajudar a discutir mudanças com o profissional. Proximidade temporal entre eventos não comprova causalidade." },
  ] },
  { id: "network", title: "Rede de cuidado", summary: "Conecte profissionais, unidades e farmácias.", routes: ["/saude/rede"], destination: "/saude/rede", steps: [
    { title: "Cadastre a referência", text: "Registre profissional, unidade ou farmácia e os dados que você conhece." },
    { title: "Reutilize os vínculos", text: "Associe o cadastro a consultas, medicamentos e processos. Isso ajuda a manter os dados consistentes nas diferentes telas." },
    { title: "Confira o evento", text: "Vínculo com uma farmácia ou profissional não comprova compra ou atendimento. Os eventos realizados têm registros próprios." },
  ] },
  { id: "hydration", title: "Hidratação", summary: "Acompanhe os volumes que você registrou.", routes: ["/saude/hidratacao"], destination: "/saude/hidratacao", steps: [
    { title: "Informe o volume", text: "Registre a quantidade de água e confira a unidade apresentada." },
    { title: "Confira o dia", text: "Consulte o total a partir dos registros e ajuste uma entrada incorreta pelo fluxo disponível." },
    { title: "Entenda a meta", text: "A meta serve para acompanhar sua rotina cadastrada. Restrições e orientações individuais devem ser discutidas com seu profissional." },
  ] },
  { id: "reminders", title: "Lembretes", summary: "Organize avisos e compromissos pessoais.", routes: ["/saude/lembretes"], destination: "/saude/lembretes", steps: [
    { title: "Crie seu aviso", text: "Informe o que deseja lembrar e confira data e horário." },
    { title: "Confira as permissões", text: "Notificações dependem das permissões e do funcionamento do dispositivo. Consulte os ajustes se os avisos não aparecerem." },
    { title: "Registre a ação na origem", text: "Concluir um lembrete não registra dose, aquisição ou retirada. Use a tela correspondente para confirmar o evento." },
  ] },
  { id: "people", title: "Pessoas e perfis", summary: "Escolha a pessoa antes de consultar ou registrar.", routes: ["/pessoas"], destination: "/pessoas", steps: [
    { title: "Confira quem está ativo", text: "O perfil selecionado define os dados de saúde em uso. Verifique o nome antes de qualquer registro." },
    { title: "Organize os cadastros", text: "Preencha os dados conhecidos e confira se a pessoa já existe antes de criar outro cadastro." },
    { title: "Troque o contexto", text: "Ao mudar de pessoa, confira novamente os resultados e formulários abertos. Dados de pessoas diferentes devem permanecer separados." },
  ] },
  { id: "personal-documents", title: "Documentos pessoais", summary: "Organize arquivos e datas por pessoa.", routes: ["/documentos"], destination: "/documentos", steps: [
    { title: "Escolha tipo e pessoa", text: "Identifique o documento e sua pessoa, conferindo título e datas quando disponíveis." },
    { title: "Guarde o arquivo", text: "Anexe o documento correto e confira a abertura do arquivo após salvar." },
    { title: "Acompanhe vencimentos", text: "Os avisos usam as datas cadastradas. Confira o documento de origem antes de agir sobre um vencimento." },
  ] },
  { id: "security-plan", title: "Plano de segurança", summary: "Mantenha orientações e contatos acessíveis.", routes: ["/saude/plano-seguranca"], destination: "/saude/plano-seguranca", steps: [
    { title: "Organize seu apoio", text: "Registre contatos e orientações combinadas com sua rede de apoio e equipe de cuidado." },
    { title: "Confira os dados", text: "Mantenha contatos e instruções atualizados para conseguir encontrá-los quando precisar." },
    { title: "Conheça o acesso", text: "Reveja onde o plano fica e como abri-lo. O aplicativo organiza o plano registrado e não monitora emergências." },
  ] },
  { id: "health-hub", title: "Saúde", summary: "Encontre as áreas e os registros do cuidado.", routes: ["/saude"], destination: "/saude", steps: [
    { title: "Escolha o contexto", text: "Confira a pessoa ativa e escolha a área do cuidado que deseja consultar." },
    { title: "Use os registros existentes", text: "Medicamentos, tratamentos, documentos e atendimentos podem ser relacionados. Confira o registro antes de criar um novo." },
    { title: "Volte às prioridades", text: "Hoje mostra a rotina por data. Vault Insight reúne prioridades e evidências sustentadas pelos registros." },
  ] },
  { id: "vaults", title: "Cofres", summary: "Organize acesso e compartilhamento conforme as permissões.", routes: ["/vaults"], destination: "/vaults", steps: [
    { title: "Escolha o cofre", text: "Confira o cofre e a conta antes de consultar ou cadastrar um item." },
    { title: "Confira o acesso", text: "Revise membros, convites e permissões antes de compartilhar. Acesso ao cofre e seleção da pessoa são contextos distintos." },
    { title: "Mantenha o controle", text: "Consulte os membros e ajustes para conferir quem possui acesso. Compartilhe apenas com as pessoas que você escolheu." },
  ] },
  { id: "passwords", title: "Senhas", summary: "Organize credenciais e confira onde serão usadas.", routes: ["/senhas"], destination: "/senhas", steps: [
    { title: "Identifique a credencial", text: "Use um título reconhecível e confira o serviço e o cofre escolhidos." },
    { title: "Consulte com cuidado", text: "Use as ações disponíveis para visualizar ou copiar os campos necessários. Confira o destino antes de utilizá-los." },
    { title: "Mantenha atualizado", text: "Ao trocar uma credencial no serviço, atualize também o cadastro correspondente no Vault." },
  ] },
  { id: "cards", title: "Cartões", summary: "Organize seus cartões e seus dados de referência.", routes: ["/cartoes"], destination: "/cartoes", steps: [
    { title: "Confira a identificação", text: "Escolha o cofre e preencha os dados conhecidos do cartão." },
    { title: "Consulte os detalhes", text: "Abra o cartão correto antes de visualizar ou copiar informações." },
    { title: "Revise mudanças", text: "Atualize o cadastro quando houver substituição ou mudança dos dados do cartão." },
  ] },
  { id: "gallery", title: "Galeria", summary: "Encontre e consulte seus arquivos.", routes: ["/galeria"], destination: "/galeria", steps: [
    { title: "Encontre o arquivo", text: "Use a galeria para consultar os arquivos disponíveis e confira sua identificação." },
    { title: "Confira o conteúdo", text: "Abra o arquivo e verifique se corresponde ao documento que procura." },
    { title: "Mantenha os vínculos", text: "Para receitas e laudos, confira também o vínculo com o registro de saúde correspondente." },
  ] },
  { id: "favorites", title: "Favoritos", summary: "Acesse rapidamente os itens que você marcou.", routes: ["/favoritos"], destination: "/favoritos", steps: [
    { title: "Escolha seus atalhos", text: "Marque os itens mais consultados usando a ação de favorito disponível nos registros." },
    { title: "Abra o registro", text: "Favoritos são atalhos para os itens existentes. Confira os dados na tela de origem." },
    { title: "Revise quando precisar", text: "Atualize suas escolhas conforme sua rotina e mantenha os acessos úteis por perto." },
  ] },
  { id: "retro-review", title: "Revisar doses antigas", summary: "Confira datas, quantidades e desfechos sem presumir o passado.", routes: [], destination: "/hoje", steps: [
    { title: "Escolha o dia correto", text: "Abra o histórico da pessoa ativa e selecione a data antes de conferir os horários. Uma falta de confirmação não comprova esquecimento." },
    { title: "Diferencie os estados", text: "Tomada, ignorada, SOS e sem confirmação são estados distintos. Só registre uma tomada se ela realmente aconteceu." },
    { title: "Revise o saldo com cautela", text: "Ajuste de estoque e registro de dose antiga são operações diferentes. Confira a quantidade e não converta automaticamente uma compra em tomadas anteriores." },
  ] },
  { id: "avatar-inspection", title: "Fênix · Inspeção e contexto", summary: "Explore o avatar 3D e seus vínculos sem confundir representação com diagnóstico.", routes: [], destination: "/saude/minha-saude", steps: [
    { title: "Abra sua representação", text: "Na Minha Saúde, toque no avatar para ampliar. Se o 3D não estiver disponível, a ilustração permanece acessível." },
    { title: "Confira a origem", text: "Toque no contexto do Brain para consultar o registro associado. Nenhuma região do corpo ou expressão visual equivale a exame ou diagnóstico." },
    { title: "Personalize com segurança", text: "Use os controles de aparência e enquadramento quando a prévia estiver ampliada. As preferências visuais não alteram os dados clínicos." },
  ] },
  { id: "sync", title: "Sincronização e dispositivos", summary: "Entenda dados locais, fila e diagnóstico.", routes: [], destination: "/mais", steps: [
    { title: "Dados locais e nuvem", text: "O Vault trabalha com dados locais e uma fila de sincronização. Uma alteração feita offline pode levar tempo para aparecer em outro dispositivo." },
    { title: "Confira a conta e o perfil", text: "Antes de comparar aparelhos, confira a conta conectada e a pessoa ativa. Use os indicadores e o diagnóstico em Mais." },
    { title: "Investigue divergências", text: "Preserve o banco local e confira o diagnóstico antes de repetir registros para compensar uma divergência. Repetir manualmente pode duplicar eventos." },
  ] },
];

const topicRoutes = helpTopics
  .flatMap(topic => topic.routes.map(route => ({ topic, route })))
  .sort((a, b) => b.route.length - a.route.length);

export function findHelpTopic(pathname: string): HelpTopic | undefined {
  return topicRoutes.find(({ route }) => pathname === route || (route !== "/" && pathname.startsWith(`${route}/`)))?.topic;
}

export function searchHelpTopics(query: string): readonly HelpTopic[] {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return helpTopics;
  return helpTopics.filter(topic => {
    const text = normalize([topic.title, topic.summary, ...topic.steps.flatMap(step => [step.title, step.text])].join(" "));
    return words.every(word => text.includes(word));
  });
}
