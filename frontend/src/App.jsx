import { useEffect, useState } from "react";
import "./App.css";
import Login from "./Login";
import { FiLogOut } from "react-icons/fi";
import { jwtDecode } from "jwt-decode";

import {
  FiGrid,
  FiInbox,
  FiUsers,
  FiBarChart2,
  FiAlertTriangle,
  FiZap,
  FiBell,
  FiFrown,
  FiFolder,
  FiClock,
  FiCheckCircle,
  FiCircle,
} from "react-icons/fi";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("supportai_token")
  );

  const [userRole, setUserRole] = useState("");
  const handleUnauthorized = () => {
    localStorage.removeItem("supportai_token");
    setUserRole("");
    setIsLoggedIn(false);
  };

  useEffect(() => {
    const token = localStorage.getItem("supportai_token");

    if (token) {
      try {
        const decoded = jwtDecode(token);

        if (!decoded.exp || decoded.exp * 1000 <= Date.now()) {
          handleUnauthorized();
          return;
        }

        setUserRole(decoded.role || "");
      } catch (error) {
        console.error("Invalid token:", error);
        handleUnauthorized();
      }
    }
  }, [isLoggedIn]);

  const handleLogout = () => {
    localStorage.removeItem("supportai_token");
    setUserRole("");
    setIsLoggedIn(false);
  };

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sentimentFilter, setSentimentFilter] = useState("All");

  const [sortBy, setSortBy] = useState("newest");

  const [showForm, setShowForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [creating, setCreating] = useState(false);

  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  // =========================================
  // ADMIN PANEL
  // =========================================

  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);

  const [supportAgents, setSupportAgents] = useState([]);

  const [agentPerformance, setAgentPerformance] = useState([]);
  const [performanceSort, setPerformanceSort] = useState("resolution");
  const [agentPerformanceLoading, setAgentPerformanceLoading] = useState(false);
  const [totalAssignedTickets, setTotalAssignedTickets] = useState(0);
  const [totalResolvedTickets, setTotalResolvedTickets] = useState(0);
  const [averageResolutionRate, setAverageResolutionRate] = useState(0);
  const [agentPerformanceError, setAgentPerformanceError] = useState("");

  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [creatingAgent, setCreatingAgent] = useState(false);

  const [newAgent, setNewAgent] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [activeSection, setActiveSection] = useState("Dashboard");

  const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  const getAuthHeaders = () => {
    const token = localStorage.getItem("supportai_token");

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: "",
    subject: "",
    description: "",
  });

  const [listening, setListening] = useState(false);

  const [editingReply, setEditingReply] = useState(false);
  const [editedReply, setEditedReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [generatingReply, setGeneratingReply] = useState(false);

  // =========================================
  // FETCH TICKETS
  // =========================================

  const fetchTickets = async () => {
    if (!userRole) return;
    try {
      setLoading(true);

      const endpoint =
        userRole === "Support Agent"
          ? "/agent/my-tickets"
          : "/tickets";

      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (response.status === 403) {
        throw new Error("You are not authorized to access these tickets");
      }

      if (!response.ok) {
        throw new Error("Failed to fetch tickets");
      }

      const data = await response.json();
      setTickets(data);

      // Get previously read notification IDs
      const savedReadNotifications = JSON.parse(
        localStorage.getItem("supportai_read_notifications") || "[]"
      );

      // Generate notifications from tickets
      const newNotifications = data
        .filter((ticket) => {
          return (
            ticket.priority === "High" ||
            ticket.escalated === "Yes" ||
            ticket.status === "Open"
          );
        })
        .slice(0, 5)
        .map((ticket) => ({
          id: ticket.id,
          title:
            ticket.escalated === "Yes"
              ? "🚨 Ticket Escalated"
              : ticket.priority === "High"
                ? "🔥 High Priority Ticket"
                : "🎫 New Open Ticket",
          message: `Ticket #${ticket.id} - ${ticket.subject}`,
          read: savedReadNotifications.includes(ticket.id),
        }));

      setNotifications(newNotifications);
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/users`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (response.status === 403) {
        throw new Error("Admin access required");
      }

      if (!response.ok) {
        throw new Error(data.detail || "Failed to fetch users");
      }

      setAdminUsers(data);
    } catch (error) {
      console.error("Error fetching admin users:", error);
    }
  };

  // =========================================
  // FETCH ADMIN USERS
  // =========================================

  const fetchSupportAgents = async () => {
    try {
      const response = await fetch(
        `${API_URL}/admin/users`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (response.status === 403) {
        throw new Error("Admin access required");
      }

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to fetch support agents"
        );
      }

      const agents = data.filter(
        (user) => user.role === "Support Agent"
      );

      setSupportAgents(agents);
    } catch (error) {
      console.error(
        "Error fetching support agents:",
        error
      );
    }
  };

  // =========================================
  // FETCH ANALYTICS
  // =========================================

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);

      const response = await fetch(
        `${API_URL}/analytics`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (response.status === 403) {
        throw new Error("You are not authorized to access analytics");
      }

      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }

      const data = await response.json();

      setAnalytics(data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchAgentPerformance = async () => {
    try {
      setAgentPerformanceLoading(true);
      setAgentPerformanceError("");

      const response = await fetch(
        `${API_URL}/admin/agent-performance`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (response.status === 403) {
        throw new Error("Admin access required");
      }

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to fetch agent performance"
        );
      }

      setAgentPerformance(data);

      const totalAssigned = data.reduce(
        (sum, agent) => sum + agent.total_tickets,
        0
      );

      const totalResolved = data.reduce(
        (sum, agent) => sum + agent.resolved_tickets,
        0
      );

      const averageRate =
        data.length > 0
          ? data.reduce(
            (sum, agent) => sum + agent.resolution_rate,
            0
          ) / data.length
          : 0;

      setTotalAssignedTickets(totalAssigned);
      setTotalResolvedTickets(totalResolved);
      setAverageResolutionRate(Number(averageRate.toFixed(2)));
    } catch (error) {
      console.error(
        "Error fetching agent performance:",
        error
      );
      setAgentPerformanceError(error.message);
    } finally {
      setAgentPerformanceLoading(false);
    }
  };

  // =========================================
  // FETCH TICKET ACTIVITIES
  // =========================================

  const fetchActivities = async (ticketId) => {
    try {
      setActivitiesLoading(true);

      const response = await fetch(
        `${API_URL}/tickets/${ticketId}/activities`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (response.status === 403) {
        throw new Error("You are not authorized to view these activities");
      }

      if (!response.ok) {
        throw new Error("Failed to fetch activities");
      }

      const data = await response.json();

      setActivities(data);
    } catch (error) {
      console.error(
        "Error fetching ticket activities:",
        error
      );

      setActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  };

  // =========================================
  // INITIAL LOAD
  // =========================================

  useEffect(() => {
    if (!isLoggedIn) return;

    fetchTickets();
    fetchAnalytics();

    if (userRole === "Admin") {
      fetchAdminUsers();
      fetchSupportAgents();
      fetchAgentPerformance();
    }

    const interval = setInterval(() => {
      fetchTickets();
      fetchAnalytics();

      if (userRole === "Admin") {
        fetchAdminUsers();
        fetchSupportAgents();
        fetchAgentPerformance();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isLoggedIn, userRole]);

  // =========================================
  // VOICE INPUT
  // =========================================

  const startVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Voice recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge."
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      const transcript =
        event.results[0][0].transcript;

      setFormData((previousData) => ({
        ...previousData,
        description:
          previousData.description
            ? previousData.description +
            " " +
            transcript
            : transcript,
      }));
    };

    recognition.onerror = (event) => {
      console.error(
        "Speech recognition error:",
        event.error
      );

      alert(
        "Voice recognition error: " +
        event.error
      );

      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  };

  // =========================================
  // CREATE TICKET
  // =========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setCreating(true);

      const response = await fetch(
        `${API_URL}/tickets`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(formData),
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (response.status === 403) {
        throw new Error("You are not authorized to create tickets");
      }

      if (!response.ok) {
        throw new Error("Failed to create ticket");
      }

      const newTicket = await response.json();

      setTickets((previousTickets) => [
        ...previousTickets,
        newTicket,
      ]);

      setNotifications((previousNotifications) => {
        const newNotification = {
          id: newTicket.id,
          title:
            newTicket.escalated === "Yes"
              ? "🚨 Ticket Escalated"
              : newTicket.priority === "High"
                ? "🔥 High Priority Ticket"
                : "🎫 New Open Ticket",
          message: `Ticket #${newTicket.id} - ${newTicket.subject}`,
          read: false,
        };

        return [
          newNotification,
          ...previousNotifications.filter(
            (notification) => notification.id !== newTicket.id
          ),
        ].slice(0, 5);
      });

      await fetchAnalytics();

      setFormData({
        customer_name: "",
        customer_email: "",
        subject: "",
        description: "",
      });

      setShowForm(false);
    } catch (error) {
      console.error("Error creating ticket:", error);
      alert("Failed to create ticket");
    } finally {
      setCreating(false);
    }
  };

  const generateReply = async () => {
    if (!selectedTicket) {
      return;
    }

    try {
      setGeneratingReply(true);
      const response = await fetch(
        `${API_URL}/tickets/${selectedTicket.id}/generate-reply`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (response.status === 403) {
        throw new Error("You are not authorized to generate this reply");
      }

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to generate AI reply"
        );
      }

      setTickets((previousTickets) =>
        previousTickets.map((ticket) =>
          ticket.id === selectedTicket.id
            ? {
              ...ticket,
              suggested_reply: data.suggested_reply,
              reply_status: "Not Sent",
            }
            : ticket
        )
      );

      setSelectedTicket((previousTicket) =>
        previousTicket
          ? {
            ...previousTicket,
            suggested_reply: data.suggested_reply,
            reply_status: "Not Sent",
          }
          : previousTicket
      );

      await fetchActivities(selectedTicket.id);

      alert("🤖 AI reply generated successfully!");
    } catch (error) {
      console.error("Error generating AI reply:", error);
      alert("❌ Failed to generate AI reply.");
    } finally {
      setGeneratingReply(false);
    }
  };

  // =========================================
  // SEND REPLY EMAIL
  // =========================================

  const sendReply = async () => {
    if (!selectedTicket) {
      return;
    }

    if (!selectedTicket.suggested_reply) {
      alert("No reply available to send.");
      return;
    }

    const confirmed = window.confirm(
      `Send this reply to ${selectedTicket.customer_email}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSendingReply(true);

      const response = await fetch(
        `${API_URL}/tickets/${selectedTicket.id}/send-reply`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (response.status === 403) {
        throw new Error("You are not authorized to send this reply");
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to send reply");
      }

      const data = await response.json();

      // Update ticket list
      setTickets((previousTickets) =>
        previousTickets.map((ticket) =>
          ticket.id === selectedTicket.id
            ? {
              ...ticket,
              reply_status: "Sent",
            }
            : ticket
        )
      );

      // Update selected ticket
      setSelectedTicket((previousTicket) =>
        previousTicket
          ? {
            ...previousTicket,
            reply_status: "Sent",
          }
          : previousTicket
      );
      await fetchActivities(selectedTicket.id);

      alert("✅ Reply sent successfully!");
    } catch (error) {
      console.error("Error sending reply:", error);
      alert("❌ Failed to send reply.");
    } finally {
      setSendingReply(false);
    }
  };

  // =========================================
  // UPDATE TICKET STATUS
  // =========================================

  const updateTicketStatus = async (
    ticketId,
    newStatus
  ) => {
    try {
      const response = await fetch(
        `${API_URL}/tickets/${ticketId}/status?status=${encodeURIComponent(
          newStatus
        )}`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (response.status === 403) {
        throw new Error("You are not authorized to update ticket status");
      }

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      const data = await response.json();

      setTickets((previousTickets) =>
        previousTickets.map((ticket) =>
          ticket.id === ticketId
            ? {
              ...ticket,
              status: newStatus,
            }
            : ticket
        )
      );

      if (
        selectedTicket &&
        selectedTicket.id === ticketId
      ) {
        setSelectedTicket({
          ...selectedTicket,
          status: newStatus,
        });
      }

      await fetchAnalytics();
      await fetchActivities(ticketId);
    } catch (error) {
      console.error(
        "Error updating ticket status:",
        error
      );

      alert("Failed to update ticket status");
    }
  };

  // =========================================
  // UPDATE ASSIGNED TEAM
  // =========================================

  const updateTicketTeam = async (
    ticketId,
    newTeam
  ) => {
    try {
      const response = await fetch(
        `${API_URL}/tickets/${ticketId}/team?team=${encodeURIComponent(
          newTeam
        )}`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (response.status === 403) {
        throw new Error("You are not authorized to update team");
      }

      if (!response.ok) {
        throw new Error("Failed to update team");
      }

      const updatedTicket = await response.json();

      // Update ticket list
      setTickets((previousTickets) =>
        previousTickets.map((ticket) =>
          ticket.id === updatedTicket.id
            ? updatedTicket
            : ticket
        )
      );

      // Update selected ticket
      setSelectedTicket(updatedTicket);

      // Refresh activity timeline
      await fetchActivities(ticketId);

    } catch (error) {
      console.error(
        "Error updating ticket team:",
        error
      );

      alert("Failed to update assigned team");
    }
  };

  // =========================================
  // ASSIGN TICKET TO SUPPORT AGENT
  // =========================================

  const assignTicketAgent = async (
    ticketId,
    agentUsername
  ) => {
    try {
      const response = await fetch(
        `${API_URL}/tickets/${ticketId}/assign-agent?agent_username=${encodeURIComponent(
          agentUsername
        )}`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (response.status === 403) {
        throw new Error("You are not authorized to assign ticket");
      }

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to assign ticket"
        );
      }

      // Update ticket list
      setTickets((previousTickets) =>
        previousTickets.map((ticket) =>
          ticket.id === ticketId
            ? {
              ...ticket,
              assigned_agent: data.assigned_agent,
            }
            : ticket
        )
      );

      // Update selected ticket
      setSelectedTicket((previousTicket) =>
        previousTicket &&
          previousTicket.id === ticketId
          ? {
            ...previousTicket,
            assigned_agent: data.assigned_agent,
          }
          : previousTicket
      );

      // Refresh activity timeline
      await fetchActivities(ticketId);

      alert(
        `✅ Ticket assigned to ${data.assigned_agent}`
      );
    } catch (error) {
      console.error(
        "Error assigning ticket agent:",
        error
      );

      alert(
        error.message ||
        "Failed to assign ticket agent"
      );
    }
  };

  // =========================================
  // FILTER TICKETS
  // =========================================

  const filteredTickets = tickets.filter(
    (ticket) => {
      const search =
        searchTerm.toLowerCase();

      const matchesSearch =
        ticket.customer_name
          ?.toLowerCase()
          .includes(search) ||
        ticket.customer_email
          ?.toLowerCase()
          .includes(search) ||
        ticket.subject
          ?.toLowerCase()
          .includes(search) ||
        ticket.description
          ?.toLowerCase()
          .includes(search) ||
        ticket.category
          ?.toLowerCase()
          .includes(search) ||
        String(ticket.id)
          .includes(search);

      const matchesStatus =
        statusFilter === "All" ||
        ticket.status === statusFilter;

      const matchesPriority =
        priorityFilter === "All" ||
        ticket.priority === priorityFilter;

      const matchesCategory =
        categoryFilter === "All" ||
        ticket.category === categoryFilter;

      const matchesSentiment =
        sentimentFilter === "All" ||
        ticket.sentiment === sentimentFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesCategory &&
        matchesSentiment
      );
    }
  );

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    if (sortBy === "newest") {
      return b.id - a.id;
    }

    if (sortBy === "oldest") {
      return a.id - b.id;
    }

    if (sortBy === "priority") {
      const priorityOrder = {
        Urgent: 4,
        High: 3,
        Medium: 2,
        Low: 1,
      };

      return (
        priorityOrder[b.priority] -
        priorityOrder[a.priority]
      );
    }

    return 0;
  });

  // =========================================
  // LOCAL STATISTICS
  // =========================================

  const totalTickets = tickets.length;

  const openTickets = tickets.filter(
    (ticket) => ticket.status === "Open"
  ).length;

  const inProgressTickets = tickets.filter(
    (ticket) => ticket.status === "In Progress"
  ).length;

  const resolvedTickets = tickets.filter(
    (ticket) => ticket.status === "Resolved"
  ).length;

  // =========================================
  // CHART DATA
  // =========================================

  const categoryChartData = analytics
    ? {
      labels: Object.keys(analytics.category_counts),
      datasets: [
        {
          label: "Tickets",
          data: Object.values(analytics.category_counts),

          backgroundColor: [
            "rgba(59, 130, 246, 0.75)",
            "rgba(139, 92, 246, 0.75)",
            "rgba(16, 185, 129, 0.75)",
            "rgba(245, 158, 11, 0.75)",
            "rgba(239, 68, 68, 0.75)",
          ],

          borderColor: [
            "rgba(59, 130, 246, 1)",
            "rgba(139, 92, 246, 1)",
            "rgba(16, 185, 129, 1)",
            "rgba(245, 158, 11, 1)",
            "rgba(239, 68, 68, 1)",
          ],

          borderWidth: 1,
          borderRadius: 8,
        },
      ],
    }
    : null;


  const statusChartData = analytics
    ? {
      labels: [
        "Open",
        "In Progress",
        "Resolved",
      ],

      datasets: [
        {
          label: "Tickets",

          data: [
            analytics.open_tickets,
            analytics.in_progress_tickets,
            analytics.resolved_tickets,
          ],

          backgroundColor: [
            "rgba(59, 130, 246, 0.75)",
            "rgba(245, 158, 11, 0.75)",
            "rgba(16, 185, 129, 0.75)",
          ],

          borderColor: [
            "rgba(59, 130, 246, 1)",
            "rgba(245, 158, 11, 1)",
            "rgba(16, 185, 129, 1)",
          ],

          borderWidth: 1,
          borderRadius: 8,
        },
      ],
    }
    : null;


  const sentimentChartData = analytics
    ? {
      labels: Object.keys(analytics.sentiment_counts),

      datasets: [
        {
          label: "Tickets",

          data: Object.values(
            analytics.sentiment_counts
          ),

          backgroundColor: [
            "rgba(100, 116, 139, 0.8)",
            "rgba(239, 68, 68, 0.8)",
            "rgba(16, 185, 129, 0.8)",
          ],

          borderColor: [
            "rgba(100, 116, 139, 1)",
            "rgba(239, 68, 68, 1)",
            "rgba(16, 185, 129, 1)",
          ],

          borderWidth: 2,
        },
      ],
    }
    : null;



  // =========================================
  // CLEAR FILTERS
  // =========================================

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setCategoryFilter("All");
    setSentimentFilter("All");
    setSortBy("newest");
  };

  if (!isLoggedIn) {
    return (
      <Login
        onLogin={() => {
          setIsLoggedIn(true);
        }}
      />
    );
  }

  return (
    <div className="dashboard">

      {/* =====================================
          LEFT SIDEBAR
      ===================================== */}

      <aside className="sidebar">

        <h2>SupportAI</h2>

        <nav>

          <a
            className={activeSection === "Dashboard" ? "active" : ""}
            onClick={() => {
              setActiveSection("Dashboard");

              window.scrollTo({
                top: 0,
                behavior: "smooth",
              });
            }}
          >
            <FiGrid />
            <span>Dashboard</span>
          </a>

          <a
            className={activeSection === "Tickets" ? "active" : ""}
            onClick={() => {
              setActiveSection("Tickets");

              document
                .getElementById("tickets-section")
                ?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
            }}
          >
            <FiInbox />
            <span>
              {userRole === "Support Agent"
                ? "My Tickets"
                : "Tickets"}
            </span>
          </a>

          <a
            className={activeSection === "Customers" ? "active" : ""}
            onClick={() => {
              setActiveSection("Customers");

              document
                .getElementById("customers-section")
                ?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
            }}
          >
            <FiUsers />
            <span>
              {userRole === "Support Agent"
                ? "My Customers"
                : "Customers"}
            </span>
          </a>

          <a
            className={activeSection === "Analytics" ? "active" : ""}
            onClick={() => {
              setActiveSection("Analytics");

              document
                .getElementById("analytics-section")
                ?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
            }}
          >
            <FiBarChart2 />
            <span>
              {userRole === "Support Agent"
                ? "My Analytics"
                : "Analytics"}
            </span>
          </a>

          {userRole === "Support Agent" && (
            <a
              className={activeSection === "Performance" ? "active" : ""}
              onClick={() => {
                setActiveSection("Performance");
                document
                  .getElementById("agent-performance-section")
                  ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
              }}
            >
              <FiBarChart2 />
              <span>My Performance</span>
            </a>
          )}

          {userRole === "Admin" && (
            <a
              className={activeSection === "Admin" ? "active" : ""}
              onClick={() => {
                setActiveSection("Admin");

                document
                  .getElementById("admin-section")
                  ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
              }}
            >
              <FiUsers />
              <span>Admin Panel</span>
            </a>
          )}

        </nav>
        <button
          className="logout-btn"
          onClick={handleLogout}
        >
          <FiLogOut />
          <span>Logout</span>
        </button>

      </aside>

      {/* =====================================
          MAIN CONTENT
      ===================================== */}

      <main className="main-content">

        {/* HEADER */}

        <header className="header">

          <div>
            <h1>
              {userRole === "Support Agent"
                ? "Support Agent Dashboard"
                : userRole === "Admin"
                  ? "Admin Support Dashboard"
                  : "Customer Support Dashboard"}
            </h1>

            <p>
              {userRole === "Support Agent"
                ? "Manage your assigned tickets and customer requests"
                : "Manage customer requests and support tickets"}
            </p>
          </div>

          <div className="header-actions">

            <button
              className="notification-button"
              onClick={() =>
                setShowNotifications(!showNotifications)
              }
            >
              🔔

              {notifications.filter(
                (notification) => !notification.read
              ).length > 0 && (
                  <span className="notification-count">
                    {
                      notifications.filter(
                        (notification) => !notification.read
                      ).length
                    }
                  </span>
                )}
            </button>

            {userRole !== "Support Agent" && (
              <button
                className="new-ticket"
                onClick={() =>
                  setShowForm(!showForm)
                }
              >
                + New Ticket
              </button>
            )}
          </div>

        </header>

        {showNotifications && (
          <div className="notification-panel">

            <div className="notification-header">
              <div>
                <h3>Notifications</h3>
                <p>Latest support alerts</p>
              </div>

              <div className="notification-header-actions">
                <button
                  className="mark-all-read"
                  onClick={() => {
                    setNotifications((previousNotifications) => {
                      const updatedNotifications = previousNotifications.map(
                        (notification) => ({
                          ...notification,
                          read: true,
                        })
                      );

                      const readIds = updatedNotifications.map(
                        (notification) => notification.id
                      );

                      localStorage.setItem(
                        "supportai_read_notifications",
                        JSON.stringify(readIds)
                      );

                      return updatedNotifications;
                    });
                  }}
                >
                  Mark all as read
                </button>

                <button
                  className="close-notifications"
                  onClick={() =>
                    setShowNotifications(false)
                  }
                >
                  ×
                </button>
              </div>
            </div>

            {notifications.length === 0 ? (
              <div className="empty-notifications">
                <span>🔕</span>
                <p>No new notifications</p>
              </div>
            ) : (
              <div className="notification-list">

                {notifications.map((notification) => (
                  <div
                    className={`notification-item ${notification.read ? "read" : "unread"
                      }`}
                    key={notification.id}
                    onClick={() => {
                      // Mark notification as read
                      setNotifications((previousNotifications) => {
                        const updatedNotifications = previousNotifications.map((item) =>
                          item.id === notification.id
                            ? { ...item, read: true }
                            : item
                        );

                        const readIds = updatedNotifications
                          .filter((item) => item.read)
                          .map((item) => item.id);

                        localStorage.setItem(
                          "supportai_read_notifications",
                          JSON.stringify(readIds)
                        );

                        return updatedNotifications;
                      });

                      const ticket = tickets.find(
                        (ticket) =>
                          ticket.id === notification.id
                      );

                      if (ticket) {
                        setSelectedTicket(ticket);
                        fetchActivities(ticket.id);
                        setShowNotifications(false);

                        setTimeout(() => {
                          document
                            .getElementById("ticket-details")
                            ?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                        }, 100);
                      }
                    }}
                  >

                    <div className="notification-icon">
                      {notification.title.includes("Escalated")
                        ? "🚨"
                        : notification.title.includes("High Priority")
                          ? "🔥"
                          : "🎫"}
                    </div>

                    <div className="notification-content">
                      <strong>
                        {notification.title}
                      </strong>

                      <p>
                        {notification.message}
                      </p>
                    </div>

                    <span className="notification-arrow">
                      →
                    </span>

                  </div>
                ))}

              </div>
            )}

          </div>
        )}

        {/* =====================================
            NEW TICKET FORM
        ===================================== */}

        {showForm && (
          <section className="ticket-form-container">

            <div className="form-header">

              <div>
                <h2>
                  Create New Ticket
                </h2>

                <p>
                  Submit a new customer support
                  request
                </p>
              </div>

              <button
                className="close-button"
                onClick={() =>
                  setShowForm(false)
                }
              >
                ×
              </button>

            </div>

            <form onSubmit={handleSubmit}>

              <div className="form-grid">

                <div className="form-group">

                  <label>
                    Customer Name
                  </label>

                  <input
                    type="text"
                    placeholder="Enter customer name"
                    value={formData.customer_name}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        customer_name:
                          event.target.value,
                      })
                    }
                    required
                  />

                </div>

                <div className="form-group">

                  <label>
                    Customer Email
                  </label>

                  <input
                    type="email"
                    placeholder="Enter customer email"
                    value={formData.customer_email}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        customer_email:
                          event.target.value,
                      })
                    }
                    required
                  />

                </div>

              </div>

              <div className="form-group">

                <label>
                  Subject
                </label>

                <input
                  type="text"
                  placeholder="Enter ticket subject"
                  value={formData.subject}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      subject:
                        event.target.value,
                    })
                  }
                  required
                />

              </div>

              <div className="form-group">

                <label>
                  Description
                </label>

                <textarea
                  placeholder="Describe the customer issue..."
                  value={formData.description}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      description:
                        event.target.value,
                    })
                  }
                  required
                />

                <button
                  type="button"
                  className="voice-button"
                  onClick={startVoiceInput}
                  disabled={listening}
                >
                  {listening ? "🎙️ Listening..." : "🎤 Speak Complaint"}
                </button>

              </div>

              <div className="form-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={() =>
                    setShowForm(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="create-button"
                  disabled={creating}
                >
                  {creating
                    ? "Creating..."
                    : "Create Ticket"}
                </button>

              </div>

            </form>

          </section>
        )}

        {/* =====================================
            STATISTICS
        ===================================== */}

        <section className="stats">

          <div className="stat-card total-card">

            <div className="stat-icon">
              <FiBarChart2 />
            </div>

            <div className="stat-content">

              <span>
                {userRole === "Support Agent"
                  ? "My Assigned Tickets"
                  : "Total Tickets"}
              </span>

              <h2>
                {totalTickets}
              </h2>

            </div>

          </div>

          <div className="stat-card open-card">

            <div className="stat-icon">
              <FiCircle />
            </div>

            <div className="stat-content">

              <span>
                {userRole === "Support Agent"
                  ? "My Open Tickets"
                  : "Open Tickets"}
              </span>

              <h2>
                {openTickets}
              </h2>

            </div>

          </div>

          <div className="stat-card progress-card">

            <div className="stat-icon">
              <FiZap />
            </div>

            <div className="stat-content">

              <span>
                {userRole === "Support Agent"
                  ? "My In Progress"
                  : "In Progress"}
              </span>

              <h2>
                {inProgressTickets}
              </h2>

            </div>

          </div>

          <div className="stat-card resolved-card">

            <div className="stat-icon">
              <FiCheckCircle />
            </div>

            <div className="stat-content">

              <span>
                {userRole === "Support Agent"
                  ? "My Resolved Tickets"
                  : "Resolved Tickets"}
              </span>

              <h2>
                {resolvedTickets}
              </h2>

            </div>

          </div>

        </section>

        {/* =====================================
            ANALYTICS
        ===================================== */}

        <section
          className="analytics-section"
          id="analytics-section"
        >

          <div className="section-header">

            <div>
              <h2>
                Analytics
              </h2>

              <p>
                Overview of customer support
                activity
              </p>
            </div>

            {analyticsLoading && (
              <span>
                Loading analytics...
              </span>
            )}

          </div>

          {/* ANALYTICS CARDS */}

          <div className="analytics-cards">

            <div className="analytics-card">

              <div className="analytics-icon">
                <FiAlertTriangle />
              </div>

              <div>

                <span>
                  High Priority
                </span>

                <h3>
                  {analytics?.high_priority_tickets ?? 0}
                </h3>

              </div>

            </div>

            <div className="analytics-card">

              <div className="analytics-icon">
                <FiZap />
              </div>

              <div>

                <span>
                  Urgent Tickets
                </span>

                <h3>
                  {analytics?.urgent_tickets ?? 0}
                </h3>

              </div>

            </div>

            <div className="analytics-card">

              <div className="analytics-icon">
                <FiBell />
              </div>

              <div>

                <span>
                  Escalated Tickets
                </span>

                <h3>
                  {analytics?.escalated_tickets ?? 0}
                </h3>

              </div>

            </div>

            <div className="analytics-card">

              <div className="analytics-icon">
                <FiFrown />
              </div>

              <div>

                <span>
                  Negative Sentiment
                </span>

                <h3>
                  {analytics?.sentiment_counts
                    ?.Negative ?? 0}
                </h3>

              </div>

            </div>

            <div className="analytics-card">

              <div className="analytics-icon">
                <FiFolder />
              </div>

              <div>

                <span>
                  Categories
                </span>

                <h3>
                  {analytics
                    ? Object.keys(
                      analytics.category_counts
                    ).length
                    : 0}
                </h3>

              </div>

            </div>

            <div className="analytics-card">

              <div className="analytics-icon">
                <FiClock />
              </div>

              <div>

                <span>
                  In Progress
                </span>

                <h3>
                  {analytics?.in_progress_tickets ??
                    0}
                </h3>

              </div>

            </div>

          </div>

          {/* CHARTS */}

          <div className="analytics-details">

            <div className="analytics-box">

              <h3>
                Tickets by Category
              </h3>

              {categoryChartData && (
                <Bar
                  data={categoryChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                  }}
                  height={220}
                />
              )}

            </div>

            <div className="analytics-box">

              <h3>
                Tickets by Status
              </h3>

              {statusChartData && (
                <Bar
                  data={statusChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                  }}
                  height={220}
                />
              )}

            </div>

            <div className="analytics-box">

              <h3>
                Customer Sentiment
              </h3>

              {sentimentChartData && (
                <Doughnut
                  data={sentimentChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                  }}
                  height={220}
                />
              )}

            </div>

          </div>

        </section>

        {/* =====================================
            TICKET DETAILS
        ===================================== */}

        {selectedTicket && (
          <section
            className="ticket-details"
            id="ticket-details"
          >

            <div className="ticket-details-header">

              <div>

                <h2>
                  Ticket #{selectedTicket.id}
                </h2>

                <p>
                  {selectedTicket.subject}
                </p>

              </div>

              <button
                className="close-button"
                onClick={() =>
                  setSelectedTicket(null)
                }
              >
                ×
              </button>

            </div>

            <div className="ticket-info">

              <div>

                <strong>
                  Customer
                </strong>

                <p>
                  {selectedTicket.customer_name}
                </p>

              </div>

              <div>

                <strong>
                  Email
                </strong>

                <p>
                  {selectedTicket.customer_email}
                </p>

              </div>

              <div>

                <strong>
                  Category
                </strong>

                <p>
                  {selectedTicket.category}
                </p>

              </div>

              <div>
                <strong>
                  Priority
                </strong>

                <select
                  value={selectedTicket.priority || "Medium"}
                  onChange={async (event) => {
                    const newPriority = event.target.value;

                    try {
                      const response = await fetch(
                        `${API_URL}/tickets/${selectedTicket.id}/priority?priority=${encodeURIComponent(
                          newPriority
                        )}`,
                        {
                          method: "PUT",
                          headers: getAuthHeaders(),
                        }
                      );

                      if (response.status === 401) {
                        handleUnauthorized();
                        return;
                      }

                      if (response.status === 403) {
                        throw new Error("You are not authorized to update ticket priority");
                      }

                      if (!response.ok) {
                        throw new Error("Failed to update priority");
                      }

                      const updatedTicket = await response.json();

                      setTickets((previousTickets) =>
                        previousTickets.map((ticket) =>
                          ticket.id === updatedTicket.id
                            ? updatedTicket
                            : ticket
                        )
                      );

                      setSelectedTicket(updatedTicket);

                      await fetchAnalytics();
                      await fetchActivities(updatedTicket.id);
                    } catch (error) {
                      console.error(
                        "Error updating priority:",
                        error
                      );

                      alert("Failed to update ticket priority");
                    }
                  }}
                >
                  <option value="Low">
                    Low
                  </option>

                  <option value="Medium">
                    Medium
                  </option>

                  <option value="High">
                    High
                  </option>

                  <option value="Urgent">
                    Urgent
                  </option>
                </select>
              </div>

              <div>
                <strong>
                  Assigned Team
                </strong>

                <select
                  value={
                    selectedTicket.assigned_team ||
                    "Customer Support"
                  }

                  onChange={(event) =>
                    updateTicketTeam(
                      selectedTicket.id,
                      event.target.value
                    )
                  }
                >
                  <option value="Customer Support">
                    Customer Support
                  </option>

                  <option value="Technical Support">
                    Technical Support
                  </option>

                  <option value="Finance Team">
                    Finance Team
                  </option>

                  <option value="Order Management">
                    Order Management
                  </option>

                  <option value="Sales Team">
                    Sales Team
                  </option>

                  <option value="General Support">
                    General Support
                  </option>
                </select>
              </div>

              {userRole === "Admin" && (
                <div>
                  <strong>
                    Assigned Agent
                  </strong>

                  <select
                    value={selectedTicket.assigned_agent || ""}
                    onChange={(event) => {
                      const agentUsername = event.target.value;

                      if (!agentUsername) return;

                      assignTicketAgent(
                        selectedTicket.id,
                        agentUsername
                      );
                    }}
                  >
                    <option value="">
                      Select Support Agent
                    </option>

                    {supportAgents.map((agent) => (
                      <option
                        key={agent.id}
                        value={agent.username}
                      >
                        {agent.username}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <strong>
                  Escalation
                </strong>

                <p>
                  {selectedTicket.escalated === "Yes" ? (
                    <span className="escalated-badge">
                      🚨 Escalated
                    </span>
                  ) : (
                    <span className="normal-badge">
                      Normal
                    </span>
                  )}
                </p>
              </div>

              <div>

                <strong>
                  Status
                </strong>

                <select
                  value={selectedTicket.status}
                  onChange={(event) =>
                    updateTicketStatus(
                      selectedTicket.id,
                      event.target.value
                    )
                  }
                >

                  <option value="Open">
                    Open
                  </option>

                  <option value="In Progress">
                    In Progress
                  </option>

                  <option value="Resolved">
                    Resolved
                  </option>

                </select>

              </div>

              <div>

                <strong>
                  Sentiment
                </strong>

                <p>
                  {selectedTicket.sentiment}
                </p>

              </div>

              <div>
                <strong>
                  Reply Status
                </strong>

                <p>
                  {selectedTicket.reply_status === "Sent" ? (
                    <span className="reply-sent-badge">
                      🟢 Sent
                    </span>
                  ) : (
                    <span className="reply-not-sent-badge">
                      ⚪ Not Sent
                    </span>
                  )}
                </p>
              </div>

            </div>

            <div className="ticket-description">

              <strong>
                Description
              </strong>

              <p>
                {selectedTicket.description}
              </p>

            </div>

            <div className="ai-reply">

              <div className="ai-reply-header">

                <strong>
                  🤖 AI Suggested Reply
                </strong>

                <div className="ai-reply-actions">

                  <button
                    type="button"
                    className="generate-reply-button"
                    onClick={generateReply}
                    disabled={!selectedTicket || generatingReply}
                  >
                    {generatingReply
                      ? "🤖 Generating..."
                      : "🤖 Generate AI Reply"}
                  </button>

                  <button
                    type="button"
                    className="edit-reply-button"
                    onClick={() => {
                      setEditedReply(
                        selectedTicket.suggested_reply || ""
                      );

                      setEditingReply(true);
                    }}
                    disabled={!selectedTicket.suggested_reply}
                  >
                    ✏️ Edit Reply
                  </button>

                  <button
                    type="button"
                    className="send-reply-button"
                    onClick={sendReply}
                    disabled={
                      sendingReply ||
                      !selectedTicket.suggested_reply
                    }
                  >
                    {sendingReply
                      ? "📤 Sending..."
                      : "📧 Send Reply"}
                  </button>

                  <button
                    type="button"
                    className="copy-reply-button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        selectedTicket.suggested_reply || ""
                      );

                      alert("AI reply copied!");
                    }}
                    disabled={!selectedTicket.suggested_reply}
                  >
                    📋 Copy Reply
                  </button>

                </div>

              </div>

              <div className="ai-reply-content">

                {editingReply ? (
                  <div className="edit-reply-container">

                    <textarea
                      className="edit-reply-textarea"
                      value={editedReply}
                      onChange={(event) =>
                        setEditedReply(event.target.value)
                      }
                    />

                    <div className="edit-reply-actions">

                      <button
                        type="button"
                        className="save-reply-button"
                        onClick={async () => {
                          try {
                            const response = await fetch(
                              `${API_URL}/tickets/${selectedTicket.id}/reply?reply=${encodeURIComponent(
                                editedReply
                              )}`,
                              {
                                method: "PUT",
                                headers: getAuthHeaders(),
                              }
                            );

                            if (response.status === 401) {
                              handleUnauthorized();
                              return;
                            }

                            if (response.status === 403) {
                              throw new Error("You are not authorized to save this reply");
                            }

                            if (!response.ok) {
                              throw new Error("Failed to save reply");
                            }

                            const data = await response.json();

                            // Update ticket list
                            setTickets((previousTickets) =>
                              previousTickets.map((ticket) =>
                                ticket.id === selectedTicket.id
                                  ? {
                                    ...ticket,
                                    suggested_reply: editedReply,
                                    reply_status: "Not Sent",
                                  }
                                  : ticket
                              )
                            );

                            // Update currently selected ticket
                            setSelectedTicket((previousTicket) =>
                              previousTicket
                                ? {
                                  ...previousTicket,
                                  suggested_reply: editedReply,
                                  reply_status: "Not Sent",
                                }
                                : previousTicket
                            );

                            setEditingReply(false);
                            setEditedReply("");

                            await fetchActivities(selectedTicket.id);

                            alert("Reply saved successfully!");
                          } catch (error) {
                            console.error(
                              "Error saving reply:",
                              error
                            );

                            alert("Failed to save reply");
                          }
                        }}
                      >
                        💾 Save Reply
                      </button>

                      <button
                        type="button"
                        className="cancel-reply-button"
                        onClick={() => {
                          setEditingReply(false);
                          setEditedReply("");
                        }}
                      >
                        ✕ Cancel
                      </button>

                    </div>

                  </div>
                ) : (
                  <p>
                    {selectedTicket.suggested_reply ||
                      "No AI reply available yet."}
                  </p>
                )}

              </div>

            </div>

            {/* =====================================
                ACTIVITY TIMELINE
            ===================================== */}

            <div className="activity-timeline">

              <div className="activity-timeline-header">
                <div>
                  <h3>Activity Timeline</h3>
                  <p>Recent activity on this ticket</p>
                </div>
              </div>

              {activitiesLoading ? (
                <div className="activity-loading">
                  Loading activity...
                </div>
              ) : activities.length === 0 ? (
                <div className="activity-empty">
                  <span>📭</span>
                  <p>No activity found for this ticket.</p>
                </div>
              ) : (
                <div className="activity-list">

                  {activities.map((activity) => (

                    <div
                      className="activity-item"
                      key={activity.id}
                    >

                      <div className="activity-icon">
                        {activity.action === "Ticket Created"
                          ? "🎫"
                          : activity.action === "Priority Changed"
                            ? "🔥"
                            : activity.action === "Status Changed"
                              ? "🔄"
                              : activity.action === "Team Assigned"
                                ? "👥"
                                : activity.action === "Reply Updated"
                                  ? "✏️"
                                  : activity.action === "Reply Sent"
                                    ? "📧"
                                    : "📌"}
                      </div>

                      <div className="activity-content">

                        <strong>
                          {activity.action}
                        </strong>

                        <p>
                          {activity.description}
                        </p>

                        <small>
                          {new Date(
                            activity.created_at
                          ).toLocaleString()}
                        </small>

                      </div>

                    </div>

                  ))}

                </div>
              )}

            </div>

          </section>
        )}

        {/* =====================================
            TICKETS SECTION
        ===================================== */}

        <section
          className="tickets-section"
          id="tickets-section"
        >

          <div className="section-header">

            <div>

              <h2>
                Recent Tickets
              </h2>

              <p>
                Customer support requests
              </p>

            </div>

            <button
              className="view-all"
              onClick={() => {
                fetchTickets();
                fetchAnalytics();
              }}
            >
              Refresh
            </button>

          </div>

          {/* FILTERS */}

          <div className="ticket-filters">

            <input
              type="text"
              placeholder="Search by name, email or subject..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
            >

              <option value="All">
                All Status
              </option>

              <option value="Open">
                Open
              </option>

              <option value="In Progress">
                In Progress
              </option>

              <option value="Resolved">
                Resolved
              </option>

            </select>

            <select
              value={priorityFilter}
              onChange={(event) =>
                setPriorityFilter(event.target.value)
              }
            >

              <option value="All">
                All Priority
              </option>

              <option value="High">
                High
              </option>

              <option value="Medium">
                Medium
              </option>

              <option value="Low">
                Low
              </option>

              <option value="Urgent">
                Urgent
              </option>

            </select>

            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(event.target.value)
              }
            >

              <option value="All">
                All Categories
              </option>

              {[
                ...new Set(
                  tickets
                    .map((ticket) => ticket.category)
                    .filter(Boolean)
                ),
              ].map((category) => (
                <option
                  key={category}
                  value={category}
                >
                  {category}
                </option>
              ))}
            </select>

            <select
              value={sentimentFilter}
              onChange={(event) =>
                setSentimentFilter(event.target.value)
              }
            >

              <option value="All">
                All Sentiment
              </option>

              <option value="Positive">
                Positive
              </option>

              <option value="Neutral">
                Neutral
              </option>

              <option value="Negative">
                Negative
              </option>

            </select>

          </div>

          <div className="filter-result-info">
            <span>
              Showing <strong>{filteredTickets.length}</strong> of{" "}
              <strong>{tickets.length}</strong> tickets
            </span>

            {(searchTerm ||
              statusFilter !== "All" ||
              priorityFilter !== "All" ||
              categoryFilter !== "All" ||
              sentimentFilter !== "All") && (
                <button
                  className="clear-filters"
                  onClick={clearFilters}
                >
                  ✕ Clear Filters
                </button>
              )}
          </div>

          {/* =====================================
              TICKET DATA
          ===================================== */}

          {loading ? (

            <p style={{ padding: "24px" }}>
              Loading tickets...
            </p>

          ) : tickets.length === 0 ? (

            <p style={{ padding: "24px" }}>
              No tickets found.
            </p>

          ) : filteredTickets.length === 0 ? (

            <div className="no-results">

              <h3>
                No matching tickets
              </h3>

              <p>
                Try changing your search or
                filters.
              </p>

              <button
                className="clear-filters"
                onClick={clearFilters}
              >
                Clear Filters
              </button>

            </div>

          ) : (

            <div className="ticket-table-container">
              <div className="ticket-table">

                {/* TABLE HEADER */}

                <div className="table-header">
                  <span>ID</span>
                  <span>Customer</span>
                  <span>Subject</span>
                  <span>Category</span>
                  <span>Priority</span>
                  <span>Status</span>
                  <span>Team</span>
                  <span>Sentiment</span>
                  <span>Escalation</span>
                  <span>Reply Status</span>
                </div>

                {/* TICKET ROWS */}

                {sortedTickets.map(
                  (ticket) => (

                    <div
                      className="ticket-row"
                      key={ticket.id}
                      onClick={() => {
                        setSelectedTicket(ticket);
                        fetchActivities(ticket.id);

                        setTimeout(() => {
                          document
                            .getElementById("ticket-details")
                            ?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                        }, 100);
                      }}
                      style={{
                        cursor: "pointer",
                      }}
                    >

                      <span>
                        #{ticket.id}
                      </span>

                      <div className="customer-cell">

                        <strong>
                          {ticket.customer_name}
                        </strong>

                        <small>
                          {ticket.customer_email}
                        </small>

                      </div>

                      <span>
                        {ticket.subject}
                      </span>

                      <span>

                        <span
                          className={`category-badge ${ticket.category.toLowerCase()}`}
                        >
                          {ticket.category}
                        </span>

                      </span>

                      <span
                        className={`priority ${ticket.priority.toLowerCase()}`}
                      >
                        {ticket.priority}
                      </span>

                      <span
                        className={`status ${ticket.status
                          .toLowerCase()
                          .replace(" ", "-")}`}
                      >
                        {ticket.status}
                      </span>

                      {/* Assigned Team */}
                      <span>
                        <span className="team-badge">
                          {ticket.assigned_team}
                        </span>
                      </span>

                      <span
                        className={`sentiment ${ticket.sentiment.toLowerCase()}`}
                      >
                        {ticket.sentiment}
                      </span>

                      <span>
                        {ticket.escalated === "Yes" ? (
                          <span className="escalated-badge">
                            🚨 Escalated
                          </span>
                        ) : (
                          <span className="normal-badge">
                            Normal
                          </span>
                        )}
                      </span>

                      <span>
                        {ticket.reply_status === "Sent" ? (
                          <span className="reply-sent-badge">
                            🟢 Sent
                          </span>
                        ) : (
                          <span className="reply-not-sent-badge">
                            ⚪ Not Sent
                          </span>
                        )}
                      </span>

                    </div>

                  )
                )}

              </div>
            </div>

          )}

        </section>

        {/* Support Agent Performance */}
        {userRole === "Support Agent" && (
          <section
            id="agent-performance-section"
            className="admin-users-section agent-performance-section"
          >
            <div className="admin-users-title">
              <h3>My Performance</h3>
              <span>Current performance overview</span>
            </div>

            <div className="admin-performance-summary">
              <div className="performance-card">
                <span>🎫</span>
                <div>
                  <p>Assigned Tickets</p>
                  <strong>{tickets.length}</strong>
                </div>
              </div>

              <div className="performance-card">
                <span>⏳</span>
                <div>
                  <p>Open Tickets</p>
                  <strong>
                    {tickets.filter((t) => t.status === "Open").length}
                  </strong>
                </div>
              </div>

              <div className="performance-card">
                <span>🔄</span>
                <div>
                  <p>In Progress</p>
                  <strong>
                    {tickets.filter((t) => t.status === "In Progress").length}
                  </strong>
                </div>
              </div>

              <div className="performance-card">
                <span>✅</span>
                <div>
                  <p>Resolved Tickets</p>
                  <strong>
                    {tickets.filter((t) => t.status === "Resolved").length}
                  </strong>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* =====================================
            CUSTOMERS SECTION
        ===================================== */}

        <section
          className="customers-section"
          id="customers-section"
        >

          <div className="section-header">

            <div>
              <h2>
                Customers
              </h2>

              <p>
                Customers who have submitted support tickets
              </p>
            </div>

            <span>
              {
                new Set(
                  tickets.map(
                    (ticket) => ticket.customer_email
                  )
                ).size
              } Customers
            </span>

          </div>

          {tickets.length === 0 ? (

            <p style={{ padding: "24px" }}>
              No customers found.
            </p>

          ) : (

            <div className="customer-list">

              {[
                ...new Map(
                  tickets.map(
                    (ticket) => [
                      ticket.customer_email,
                      ticket,
                    ]
                  )
                ).values(),
              ].map((customer) => {

                const customerTickets =
                  tickets.filter(
                    (ticket) =>
                      ticket.customer_email ===
                      customer.customer_email
                  );

                return (

                  <div
                    className={`customer-card ${selectedCustomer?.customer_email === customer.customer_email
                      ? "selected"
                      : ""
                      }`}
                    key={customer.customer_email}
                    onClick={() => {
                      setSelectedCustomer(customer);

                      setTimeout(() => {
                        document
                          .getElementById("customer-details")
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                      }, 100);
                    }}
                    style={{ cursor: "pointer" }}
                  >

                    <div className="customer-avatar">
                      {customer.customer_name
                        ?.charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="customer-info">

                      <h3>
                        {customer.customer_name}
                      </h3>

                      <p>
                        {customer.customer_email}
                      </p>

                    </div>

                    <div className="customer-ticket-count">

                      <strong>
                        {customerTickets.length}
                      </strong>

                      <span>
                        Tickets
                      </span>

                    </div>

                  </div>

                );
              })}

            </div>

          )}

        </section>

        {/* =====================================
             ADMIN PANEL
        ===================================== */}

        {userRole === "Admin" && (
          <section
            className="admin-section"
            id="admin-section"
          >
            <div className="section-header">
              <div>
                <h2>Admin Panel</h2>
                <p>Manage SupportAI users and support agents</p>
              </div>

            </div>

            <div className="admin-card">

              <div className="admin-card-header">
                <div>
                  <h3>User Management</h3>
                  <p>Manage Admins and Support Agents</p>
                </div>

                <span className="admin-role-badge">
                  🛡️ Admin Access
                </span>
              </div>

              {/* CREATE AGENT BUTTON */}
              <div className="admin-actions">
                <button
                  className="admin-action-button"
                  onClick={() => setShowCreateAgent(!showCreateAgent)}
                >
                  ➕ Add Support Agent
                </button>
              </div>

              {/* CREATE AGENT FORM */}
              {showCreateAgent && (
                <div className="admin-create-form">

                  <h3>Create Support Agent</h3>

                  <input
                    type="text"
                    placeholder="Username"
                    value={newAgent.username}
                    onChange={(e) =>
                      setNewAgent({
                        ...newAgent,
                        username: e.target.value,
                      })
                    }
                  />

                  <input
                    type="email"
                    placeholder="Email"
                    value={newAgent.email}
                    onChange={(e) =>
                      setNewAgent({
                        ...newAgent,
                        email: e.target.value,
                      })
                    }
                  />

                  <input
                    type="password"
                    placeholder="Password"
                    value={newAgent.password}
                    onChange={(e) =>
                      setNewAgent({
                        ...newAgent,
                        password: e.target.value,
                      })
                    }
                  />

                  <button
                    className="admin-create-button"
                    disabled={creatingAgent}
                    onClick={async () => {

                      if (
                        !newAgent.username ||
                        !newAgent.email ||
                        !newAgent.password
                      ) {
                        alert("Please fill all fields");
                        return;
                      }

                      setCreatingAgent(true);

                      try {
                        const response = await fetch(
                          `${API_URL}/admin/users`,
                          {
                            method: "POST",
                            headers: getAuthHeaders(),
                            body: JSON.stringify(newAgent),
                          }
                        );

                        const data = await response.json();

                        if (response.status === 401) {
                          handleUnauthorized();
                          return;
                        }

                        if (response.status === 403) {
                          throw new Error("You are not authorized to create a Support Agent");
                        }

                        if (!response.ok) {
                          throw new Error(
                            data.detail ||
                            "Failed to create Support Agent"
                          );
                        }

                        alert(
                          "Support Agent created successfully!"
                        );

                        setNewAgent({
                          username: "",
                          email: "",
                          password: "",
                        });

                        setShowCreateAgent(false);

                        fetchAdminUsers();
                        fetchSupportAgents();

                      } catch (error) {
                        alert(error.message);
                      } finally {
                        setCreatingAgent(false);
                      }
                    }}
                  >
                    {creatingAgent
                      ? "Creating..."
                      : "Create Agent"}
                  </button>

                </div>
              )}

              {/* USERS LIST */}
              <div className="admin-users-section">

                <div className="admin-users-title">
                  <h3>All Users</h3>
                  <span>
                    {adminUsers.length} users
                  </span>
                </div>

                {adminUsersLoading ? (
                  <p>Loading users...</p>
                ) : adminUsers.length === 0 ? (
                  <p>No users found.</p>
                ) : (
                  <div className="admin-users-list">

                    {adminUsers.map((user) => (
                      <div
                        className="admin-user-row"
                        key={user.id}
                      >

                        <div className="admin-user-details">

                          <div className="admin-user-icon">
                            👤
                          </div>

                          <div>
                            <strong>
                              {user.username}
                            </strong>

                            <p>
                              {user.email}
                            </p>

                            <small>
                              ID: {user.id}
                            </small>
                          </div>

                        </div>

                        <div className="admin-user-controls">

                          {/* ROLE */}
                          <select
                            value={user.role}
                            onChange={async (e) => {

                              const newRole =
                                e.target.value;

                              try {

                                const response =
                                  await fetch(
                                    `${API_URL}/admin/users/${user.id}/role?role=${encodeURIComponent(newRole)}`,
                                    {
                                      method: "PUT",
                                      headers:
                                        getAuthHeaders(),
                                    }
                                  );

                                const data =
                                  await response.json();

                                if (response.status === 401) {
                                  handleUnauthorized();
                                  return;
                                }

                                if (response.status === 403) {
                                  throw new Error("You are not authorized to update user role");
                                }

                                if (!response.ok) {
                                  throw new Error(
                                    data.detail ||
                                    "Failed to update user role"
                                  );
                                }

                                fetchAdminUsers();

                              } catch (error) {
                                alert(error.message);
                              }

                            }}
                          >
                            <option value="Admin">
                              Admin
                            </option>

                            <option value="Support Agent">
                              Support Agent
                            </option>
                          </select>

                          {/* DELETE */}
                          <button
                            className="admin-delete-button"
                            onClick={async () => {

                              if (
                                user.username === "admin"
                              ) {
                                alert(
                                  "You cannot delete the current admin account."
                                );
                                return;
                              }

                              const confirmed =
                                window.confirm(
                                  `Delete user "${user.username}"?`
                                );

                              if (!confirmed) return;

                              try {

                                const response =
                                  await fetch(
                                    `${API_URL}/admin/users/${user.id}`,
                                    {
                                      method: "DELETE",
                                      headers:
                                        getAuthHeaders(),
                                    }
                                  );

                                const data =
                                  await response.json();

                                if (response.status === 401) {
                                  handleUnauthorized();
                                  return;
                                }

                                if (response.status === 403) {
                                  throw new Error("You are not authorized to update user role");
                                }

                                if (!response.ok) {
                                  throw new Error(
                                    data.detail ||
                                    "Failed to delete user"
                                  );
                                }

                                alert(
                                  "User deleted successfully!"
                                );

                                fetchAdminUsers();

                              } catch (error) {
                                alert(error.message);
                              }

                            }}
                          >
                            🗑️ Delete
                          </button>

                        </div>

                      </div>
                    ))}

                  </div>
                )}

              </div>

              {/* ADMIN PERFORMANCE SUMMARY */}
              <div className="admin-performance-summary">

                <div className="performance-card">
                  <span>👥</span>
                  <div>
                    <p>Total Agents</p>
                    <strong>{agentPerformance.length}</strong>
                  </div>
                </div>

                <div className="performance-card">
                  <span>🎫</span>
                  <div>
                    <p>Assigned Tickets</p>
                    <strong>{totalAssignedTickets}</strong>
                  </div>
                </div>

                <div className="performance-card">
                  <span>✅</span>
                  <div>
                    <p>Resolved Tickets</p>
                    <strong>{totalResolvedTickets}</strong>
                  </div>
                </div>

                <div className="performance-card">
                  <span>📈</span>
                  <div>
                    <p>Average Resolution Rate</p>
                    <strong>{averageResolutionRate}%</strong>
                  </div>
                </div>

              </div>

              {/* AGENT PERFORMANCE */}
              <div className="admin-users-section">
                <div className="admin-users-title">
                  <h3>Agent Performance</h3>

                  <div>
                    <span>{agentPerformance.length} agents</span>

                    <select
                      value={performanceSort}
                      onChange={(e) => setPerformanceSort(e.target.value)}
                    >
                      <option value="resolution">Highest Resolution Rate</option>
                      <option value="tickets">Most Tickets</option>
                      <option value="name">Agent Name</option>
                    </select>
                  </div>
                </div>

                {agentPerformanceLoading ? (
                  <p className="agent-performance-loading">
                    Loading performance...
                  </p>
                ) : agentPerformanceError ? (
                  <p className="agent-performance-error">
                    {agentPerformanceError}
                  </p>
                ) : agentPerformance.length === 0 ? (
                  <p className="agent-performance-empty">
                    No agent performance data found.
                  </p>
                ) : (
                  <div className="admin-users-list">
                    {[...agentPerformance]
                      .sort((a, b) => {
                        if (performanceSort === "resolution") {
                          return b.resolution_rate - a.resolution_rate;
                        }

                        if (performanceSort === "tickets") {
                          return b.total_tickets - a.total_tickets;
                        }

                        return a.username.localeCompare(b.username);
                      })
                      .map((agent, index) => (
                        <div className="admin-user-row" key={agent.username}>
                          <div className="admin-user-info">
                            <strong>
                              #{index + 1} {agent.username}

                              {agentPerformance.length > 0 &&
                                index === 0 && (
                                  <span className="top-performer-badge">
                                    🏆 Top Performer
                                  </span>
                                )}
                            </strong>

                            <span>{agent.email}</span>
                          </div>

                          <div className="admin-user-stats">
                            <span>Total: {agent.total_tickets}</span>
                            <span>Open: {agent.open_tickets}</span>
                            <span>In Progress: {agent.in_progress_tickets}</span>
                            <span>Resolved: {agent.resolved_tickets}</span>
                            <span>Escalated: {agent.escalated_tickets}</span>
                            <span className="resolution-rate">
                              Resolution Rate: {agent.resolution_rate}%
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

            </div>
          </section>
        )}

      </main >

    </div >
  );
}

export default App;