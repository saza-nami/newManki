TARGETS=	addPassable.pdf \
			changePasswd.pdf \
			delPassable.pdf \
			intro.pdf \
			loginAdmin.pdf \
			manageCar.pdf \
			reqCarInfo.pdf \
			reqPassAdmin.pdf \
			terminateAdmin.pdf \

PANDOC=		pandoc
PANDOCFLAGS=	--pdf-engine=xelatex \
		-V classoption=pandoc \
		-V documentclass=bxjsarticle \
		-V papersize:a4
RM=		rm -f
SHELL=		/bin/sh

all: $(TARGETS)

.SUFFIXES:
.SUFFIXES: .md .pdf

.md.pdf:
	$(PANDOC) $(PANDOCFLAGS) $< -o $@

.PHONY: clean
clean:
	$(RM) $(TARGETS)
