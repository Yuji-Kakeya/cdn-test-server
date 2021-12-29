provider "aws" {
  region = "ap-northeast-1"
}

#######################
# VPC
#######################
resource "aws_vpc" "main" {
  cidr_block = "192.168.0.0/24"
  enable_dns_support = true
  enable_dns_hostnames = true
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

resource "aws_subnet" "subnet_a" {
  vpc_id            = aws_vpc.main.id
  availability_zone = "ap-northeast-1a"
  cidr_block        = "192.168.0.0/25"
}

resource "aws_subnet" "subnet_c" {
  vpc_id            = aws_vpc.main.id
  availability_zone = "ap-northeast-1c"
  cidr_block        = "192.168.0.128/25"
}

resource "aws_route_table" "main" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route" "main" {
  destination_cidr_block = "0.0.0.0/0"
  route_table_id         = aws_route_table.main.id
  gateway_id             = aws_internet_gateway.main.id
}

resource "aws_main_route_table_association" "main" {
  vpc_id         = aws_vpc.main.id
  route_table_id = aws_route_table.main.id
}

#######################
# Security Groups       
#######################
resource "aws_security_group" "web" {
  name   = "SecurityGroup_AllowWebTraffic"
  vpc_id = aws_vpc.main.id

  ingress {
    description      = "Allow HTTP traffic"
    from_port        = 80
    to_port          = 80
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
  ingress {
    description      = "Allow HTTPS traffic"
    from_port        = 443
    to_port          = 443
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}

#######################
# ALB         
#######################
resource "aws_alb" "main" {
  name            = "alb"
  security_groups = [aws_security_group.web.id]
  subnets         = [aws_subnet.subnet_a.id, aws_subnet.subnet_c.id]
  internal        = false
}

resource "aws_alb_target_group" "http" {
  name        = "alb-target"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    port = 80
    path = "/"
  }
}

resource "aws_alb_listener" "http" {
  port              = "80"
  protocol          = "HTTP"
  load_balancer_arn = aws_alb.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.http.arn
  }
}

output "alb_dns_name" {
  value = aws_alb.main.dns_name
}

#######################
# IAM                 
#######################

data "aws_iam_policy_document" "main" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs.amazonaws.com", "ecs-tasks.amazonaws.com"]
    }
  }
}
resource "aws_iam_policy" "main" {
  name   = "fargate_execution_policy"
  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [  
    {
        "Effect": "Allow",
        "Action": [
            "ecr:GetDownloadUrlForLayer",
            "ecr:BatchGetImage",
            "ecr:BatchCheckLayerAvailability",
            "ecr:GetAuthorizationToken",
            "logs:CreateLogGroup",
            "logs:CreateLogStream",
            "logs:PutLogEvents"
        ],
        "Resource": "*"
    }
  ]
}
EOF
}

resource "aws_iam_role" "main" {
  name               = "fargate"
  assume_role_policy = data.aws_iam_policy_document.main.json
}

resource "aws_iam_role_policy_attachment" "main" {
  role       = aws_iam_role.main.name
  policy_arn = aws_iam_policy.main.arn
}


#######################
# ECS                 
#######################
resource "aws_ecs_cluster" "main" {
  name = "cdn-test-server"
}

resource "aws_ecs_task_definition" "main" {
  family                   = "cdn-test-server"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "1024"
  network_mode             = "awsvpc"
  execution_role_arn       = aws_iam_role.main.arn
  task_role_arn            = aws_iam_role.main.arn
  container_definitions = <<EOL
[
  {
    "name": "cdn-test-server",
    "image": "public.ecr.aws/k2n2r9f5/cdn-test-server",
    "portMappings": [
      {
        "containerPort": 80,
        "hostPort": 80
      },
      {
        "containerPort": 443,
        "hostPort": 443
      }
    ]
  }
]
EOL
}

resource "aws_ecs_service" "main" {
  name = "cdn-test-server"
  cluster = aws_ecs_cluster.main.id

  task_definition = aws_ecs_task_definition.main.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  depends_on = [aws_alb_listener.http]

  load_balancer {
    target_group_arn = aws_alb_target_group.http.arn
    container_name   = "cdn-test-server"
    container_port   = "80"
  }

  network_configuration {
    subnets          = [aws_subnet.subnet_a.id, aws_subnet.subnet_c.id]
    security_groups  = [aws_security_group.web.id]
    assign_public_ip = true
  }
}